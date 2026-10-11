export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";
import { useViewStore } from "@/store/viewStore";

export type TourStep = {
  id: string;
  /** CSS-селектор целевого элемента. Если null — центрированный попап без подсветки. */
  target: string | null;
  title: string;
  content: string;
  placement: TourPlacement;
  /** Действие, которое нужно выполнить перед показом шага. */
  beforeShow?: () => void;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    title: "Добро пожаловать в Domain Studio",
    content:
      "Это редактор схем доменов EVO. Быстро проведём по интерфейсу, чтобы вы знали, где что находится. Займёт меньше минуты.",
    placement: "center",
  },

  {
    id: "editor",
    target: '[data-tour="editor"]',
    title: "Редактор схемы",
    content:
      "Основная рабочая область. YAML-схема с автокомплитом, подсветкой и валидацией в реальном времени. Кликните на любую строку — инспектор справа покажет справку по этому блоку.",
    placement: "right",
    beforeShow: () => {
      useViewStore.getState().setViewMode("editor");
    },
  },

  {
    id: "outline",
    target: '[data-tour="outline"]',
    title: "Структура схемы",
    content:
      "Слева — дерево всех элементов: сущности, связи, представления, действия. Клик по элементу переместит вас к нему в редакторе. Есть поиск и быстрые кнопки добавления.",
    placement: "right",
  },

  {
    id: "inspector",
    target: '[data-tour="inspector"]',
    title: "Инспектор",
    content:
      "Справа — контекстная панель. Показывает, какие поля доступны для выбранного блока, что уже задано и какие действия можно выполнить. Например, создать правило данных или сгенерировать CRUD.",
    placement: "left",
  },

  {
    id: "wizards",
    target: '[data-tour="wizards"]',
    title: "Визарды",
    content:
      "Здесь собраны все генераторы: сущности, атрибуты, связи, представления, действия, правила данных, миксины. Каждый визард проводит по шагам и создаёт готовый YAML-фрагмент.",
    placement: "bottom",
  },

  {
    id: "commandPalette",
    target: null,
    title: "Палитра команд",
    content:
      "Нажмите Ctrl+K (или ⌘K) в любой момент — откроется палитра со всеми командами. Там же — визарды, пресеты, инструменты. Работает даже внутри редактора.",
    placement: "center",
  },

  {
    id: "tools",
    target: '[data-tour="tools"]',
    title: "Инструменты",
    content:
      "В этом меню — пресеты схем, карта покрытия, библиотека миксинов, приоритеты, форматирование и сравнение. Всё, что не используется постоянно.",
    placement: "bottom",
  },

  {
    id: "graph",
    target: '[data-tour="view-tabs"]',
    title: "Диаграмма",
    content:
      "Вторая вкладка — визуальная диаграмма сущностей и связей. Перетаскивайте узлы, создавайте связи протягиванием, открывайте контекстное меню правым кликом.",
    placement: "bottom",
    beforeShow: () => {
      useViewStore.getState().setViewMode("graph");
    },
  },

  {
    id: "problems",
    target: '[data-tour="problems"]',
    title: "Панель проблем",
    content:
      "Внизу — все ошибки и предупреждения. Клик по строке переходит к месту ошибки в редакторе. Фильтры позволяют скрыть ненужные категории.",
    placement: "top",
    beforeShow: () => {
      useViewStore.getState().setViewMode("editor");
    },
  },

  {
    id: "statusbar",
    target: '[data-tour="statusbar"]',
    title: "Статус-бар",
    content:
      "Здесь — имя файла, количество ошибок и предупреждений, позиция курсора. Иконка ⚠ позволяет быстро отключить показ предупреждений в редакторе.",
    placement: "top",
  },

  {
    id: "help-settings",
    target: '[data-tour="help-settings"]',
    title: "Справка и настройки",
    content:
      "Здесь — список всех горячих клавиш (Ctrl+Shift+/) и настройки приложения (Ctrl+,): тема, шрифт, автосохранение, фильтры валидации.",
    placement: "bottom",
  },

  {
    id: "done",
    target: null,
    title: "Готово!",
    content:
      "Всё, что нужно для работы. Открывайте визард «Базовая сущность» из меню «Визарды» и создайте свою первую схему. Тур можно запустить заново из справки.",
    placement: "center",
  },
];
