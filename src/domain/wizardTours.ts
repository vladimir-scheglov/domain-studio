export type WizardTourStep = {
  /** Имя поля (data-wizard-field). */
  field: string;
  /** Индекс шага визарда, на котором находится поле. */
  wizardStep: number;
  title: string;
  content: string;
};

export type WizardTour = {
  id: string;
  steps: WizardTourStep[];
};

export const WIZARD_TOURS: Record<string, WizardTour> = {
  /* ============ Генерация CRUD ============ */

  "scenario.fromEntity": {
    id: "scenario.fromEntity",
    steps: [
      {
        field: "entityId",
        wizardStep: 0,
        title: "Сущность",
        content:
          "Из какой сущности генерировать CRUD? Выберите из списка существующих.",
      },
      {
        field: "prefix",
        wizardStep: 0,
        title: "Префикс id",
        content:
          "Используется в id: lists_<prefix>, actions_<prefix>_create, view<EntityId>.",
      },
      {
        field: "columns",
        wizardStep: 0,
        title: "Колонки списка",
        content:
          "Отметьте атрибуты, которые показывать в списке. Если не выбрать — возьмутся первые 5.",
      },
      {
        field: "withList",
        wizardStep: 0,
        title: "Что генерировать",
        content:
          "Включите только нужные компоненты: список, панель, модальное окно, действия, меню. Всё создаётся за один клик.",
      },
    ],
  },

  /* ============ Базовая сущность ============ */

  "entity.basic": {
    id: "entity.basic",
    steps: [
      {
        field: "id",
        wizardStep: 0,
        title: "ID сущности",
        content:
          "Уникальный идентификатор: латиница, цифры, подчёркивание. Начинается с буквы.",
      },
      {
        field: "label",
        wizardStep: 0,
        title: "Шаблон названия",
        content:
          "Как объект будет отображаться в списках. Можно использовать {attribute_id}.",
      },
      {
        field: "withFirstAttribute",
        wizardStep: 0,
        title: "Первый атрибут",
        content:
          "Сразу создадим один атрибут? Можно отключить и добавить позже.",
      },
    ],
  },

  /* ============ Связь ============ */

  "linkage.basic": {
    id: "linkage.basic",
    steps: [
      {
        field: "side1",
        wizardStep: 0,
        title: "Сторона 1",
        content:
          "Левая сторона связи. Направление идёт от этой сущности к side2.",
      },
      {
        field: "side2",
        wizardStep: 0,
        title: "Сторона 2",
        content: "Правая сторона. К этой сущности идёт направление.",
      },
      {
        field: "type",
        wizardStep: 0,
        title: "Тип связи",
        content:
          "1-1 — один к одному. 1-N — один ко многим. N-N — многие ко многим.",
      },
      {
        field: "nameFrom",
        wizardStep: 0,
        title: "Глаголы связи",
        content:
          "Как отображается связь с каждой стороны. Например: «Содержит» и «Принадлежит».",
      },
    ],
  },

  /* ============ Правило данных ============ */

  "rule.required": {
    id: "rule.required",
    steps: [
      {
        field: "entityId",
        wizardStep: 0,
        title: "Сущность",
        content: "Для какой сущности задаём правило.",
      },
      {
        field: "attributeId",
        wizardStep: 0,
        title: "Атрибут",
        content: "Какой атрибут становится обязательным при условии.",
      },
      {
        field: "condition",
        wizardStep: 0,
        title: "Условие (RQL)",
        content:
          "Когда правило срабатывает. Нажмите «Открыть RQL» для удобного редактора. Пустое условие = всегда.",
      },
      {
        field: "message",
        wizardStep: 0,
        title: "Сообщение об ошибке",
        content: "Что показывать пользователю, если атрибут не заполнен.",
      },
    ],
  },

  /* ============ Пакет навигации ============ */

  "scenario.navigationPack": {
    id: "scenario.navigationPack",
    steps: [
      {
        field: "menuRoute",
        wizardStep: 0,
        title: "Маршрут меню",
        content:
          "Начинается со слэша. Например: /dashboard. Отображается в адресной строке.",
      },
      {
        field: "withTabs",
        wizardStep: 0,
        title: "Что генерировать",
        content:
          "Включите нужные части: вкладки со списками, dashboard, дерево навигации, меню.",
      },
    ],
  },

  /* ============ Пресет миксина ============ */

  "mixin.view.views": {
    id: "mixin.view.views",
    steps: [
      {
        field: "entity",
        wizardStep: 0,
        title: "Целевая сущность",
        content: "В представления какой сущности встраивается примесь.",
      },
      {
        field: "weight",
        wizardStep: 0,
        title: "Приоритет",
        content:
          "Чем меньше число — тем выше приоритет. Необязательно, но полезно при нескольких примесях.",
      },
    ],
  },

  /* ============ Колонка в список ============ */

  "view.column": {
    id: "view.column",
    steps: [
      {
        field: "viewId",
        wizardStep: 0,
        title: "Списочное представление",
        content:
          "В какой список добавляем колонку. Выберите существующий view типа list.",
      },
      {
        field: "columnId",
        wizardStep: 0,
        title: "ID колонки",
        content:
          "Уникальный идентификатор столбца. Если такой уже есть — валидация подсветит.",
      },
      {
        field: "attributeId",
        wizardStep: 0,
        title: "Атрибут",
        content:
          "Значение какого атрибута отображается. Может быть пользовательским или системным.",
      },
      {
        field: "control",
        wizardStep: 0,
        title: "Элемент управления",
        content:
          "Как отображать: текст, ссылка, тег, уровень, bool. По умолчанию — автоматически по типу атрибута.",
      },
    ],
  },
};
