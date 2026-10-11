export type HotkeyItem = {
  action: string;
  mac: string;
  win: string;
  hint?: string;
  /** Опциональный код для будущей кастомизации. */
  code?: string;
};

export type HotkeyGroup = {
  id: string;
  title: string;
  items: HotkeyItem[];
};

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);

export function pickKey(item: HotkeyItem): string {
  return isMac ? item.mac : item.win;
}

export function isMacPlatform(): boolean {
  return isMac;
}

export const HOTKEY_GROUPS: HotkeyGroup[] = [
  {
    id: "palettes",
    title: "Палитры",
    items: [
      {
        action: "Палитра команд",
        mac: "⌘K",
        win: "Ctrl+K",
        hint: "Все визарды и команды",
      },
      {
        action: "Палитра команд (альтернативная)",
        mac: "⌘⇧P",
        win: "Ctrl+Shift+P",
      },
      {
        action: "Палитра сниппетов",
        mac: "⌘J",
        win: "Ctrl+J",
        hint: "Вставка блоков в текущий контекст",
      },
      {
        action: "Меню визардов",
        mac: "—",
        win: "—",
        hint: "Кнопка «Визарды» в тулбаре",
      },
    ],
  },

  {
    id: "file",
    title: "Файл",
    items: [
      { action: "Открыть", mac: "⌘O", win: "Ctrl+O" },
      { action: "Сохранить", mac: "⌘S", win: "Ctrl+S" },
      { action: "Сохранить как", mac: "⌘⇧S", win: "Ctrl+Shift+S" },
      {
        action: "Скопировать YAML",
        mac: "⌘⇧C",
        win: "Ctrl+Shift+C",
      },
      {
        action: "Пресеты схем",
        mac: "⌘⇧T",
        win: "Ctrl+Shift+T",
      },
    ],
  },

  {
    id: "editor",
    title: "Редактор",
    items: [
      {
        action: "Подсказки автокомплита",
        mac: "⌃Space / ⌘I",
        win: "Ctrl+Space / Ctrl+I",
        hint: "На macOS ⌃Space может перехватываться системой",
      },
      {
        action: "Раскрыть сниппет (emmet)",
        mac: "⌥Tab",
        win: "Alt+Tab",
        hint: "Например: entity + ⌥Tab",
      },
      {
        action: "Раскрыть сниппет (альтернативный)",
        mac: "⌃Space / ⌘Enter",
        win: "Ctrl+Space / Ctrl+Enter",
      },
      {
        action: "Быстрые исправления",
        mac: "⌘.",
        win: "Ctrl+.",
        hint: "Quick fixes для ошибок в маркерах",
      },
      {
        action: "Форматировать документ",
        mac: "⇧⌥F",
        win: "Shift+Alt+F",
        hint: "Отступы и пробелы",
      },
      {
        action: "Форматировать и упорядочить ключи",
        mac: "⌘⇧⌥F",
        win: "Ctrl+Shift+Alt+F",
      },
      {
        action: "Отменить",
        mac: "⌘Z",
        win: "Ctrl+Z",
        hint: "Вне редактора — откатывает патчи визардов",
      },
      {
        action: "Повторить",
        mac: "⌘⇧Z",
        win: "Ctrl+Shift+Z",
      },
      { action: "Найти", mac: "⌘F", win: "Ctrl+F" },
      {
        action: "Найти и заменить",
        mac: "⌘⌥F",
        win: "Ctrl+H",
      },
    ],
  },

  {
    id: "mixin",
    title: "Миксины",
    items: [
      {
        action: "Библиотека миксинов",
        mac: "⌘⇧L",
        win: "Ctrl+Shift+L",
        hint: "Пресеты типовых примерсей",
      },
      {
        action: "Приоритеты миксинов",
        mac: "⌘⇧M",
        win: "Ctrl+Shift+M",
        hint: "Порядок и веса примесей",
      },
    ],
  },

  {
    id: "analysis",
    title: "Анализ",
    items: [
      {
        action: "Карта покрытия схемы",
        mac: "⌘⇧U",
        win: "Ctrl+Shift+U",
        hint: "Показать непокрытые сущности",
      },
      {
        action: "Справка (этот раздел)",
        mac: "⌘⇧/",
        win: "Ctrl+Shift+/",
      },
      {
        action: "Настройки",
        mac: "⌘,",
        win: "Ctrl+,",
      },
    ],
  },

  {
    id: "navigation",
    title: "Навигация",
    items: [
      {
        action: "Переключить Редактор / Диаграмма",
        mac: "⌘1",
        win: "Ctrl+1",
        hint: "Пока не реализовано — в планах",
      },
      {
        action: "К структуре (Outline)",
        mac: "⌘2",
        win: "Ctrl+2",
        hint: "Пока не реализовано — в планах",
      },
    ],
  },
  {
    id: "diff",
    title: "Сравнение",
    items: [
      {
        action: "Сравнить с файлом",
        mac: "⌘⇧D",
        win: "Ctrl+Shift+D",
        hint: "Diff текущего документа с YAML-файлом",
      },
    ],
  },
  {
    id: "help",
    title: "Справка",
    items: [
      {
        action: "Обзорный тур",
        mac: "⌘⇧H",
        win: "Ctrl+Shift+H",
        hint: "Пройти по интерфейсу заново",
      },
    ],
  },
];
