/**
 * Метаданные схемы домена.
 *
 * Используются:
 *  - инспектором — чтобы показать справку и допустимые поля;
 *  - автокомплитом — чтобы знать, какие ключи доступны в текущем блоке;
 *  - палитрой команд — чтобы знать, что можно сгенерировать по контексту.
 *
 * Структура ключа — путь в схеме с [*] на месте индексов массива.
 * Пример: 'entities[*].attributes[*]' — атрибут сущности.
 */

export type SchemaFieldType =
  "string" | "number" | "boolean" | "array" | "object" | "enum" | "ref";

export type SchemaField = {
  name: string;
  type: SchemaFieldType;
  required?: boolean;
  description?: string;
  /** Ссылка на что-то: id сущности, связи, атрибута, представления и т.п. */
  refTo?: "entity" | "attribute" | "linkage" | "view" | "action" | "dataType";
  /** Группа для визуальной группировки в инспекторе. */
  group?: string;
  /** Значения enum, если type === 'enum'. */
  values?: string[];
};

export type SchemaNode = {
  /** Человекочитаемый заголовок блока. */
  title: string;
  /** Краткое описание блока. */
  description?: string;
  /** Поля, допустимые в этом блоке. */
  fields: SchemaField[];
  /** Ссылка на раздел документации (для кнопки «Справка»). */
  docsAnchor?: string;
};

/* ------------------------------------------------------------------ */
/*                        Описание узлов                              */
/* ------------------------------------------------------------------ */

export const schemaMetadata: Record<string, SchemaNode> = {
  "": {
    title: "Схема домена",
    description:
      "Корневой блок. Определяет метаданные домена и его наполнение.",
    docsAnchor: "domain-schema",
    fields: [
      f(
        "id",
        "string",
        true,
        "FQDN-идентификатор домена",
        undefined,
        "Метаданные",
      ),
      f("type", "enum", true, "Всегда domain", undefined, "Метаданные", [
        "domain",
      ]),
      f(
        "version",
        "string",
        true,
        "Версия схемы (SemVer)",
        undefined,
        "Метаданные",
      ),
      f("name", "string", true, "Название схемы", undefined, "Метаданные"),
      f(
        "description",
        "string",
        false,
        "Описание домена",
        undefined,
        "Метаданные",
      ),
      f(
        "status",
        "string",
        false,
        "Статус разработки",
        undefined,
        "Метаданные",
      ),
      f("date", "string", false, "Дата создания", undefined, "Метаданные"),
      f("author", "string", false, "Автор схемы", undefined, "Метаданные"),
      f(
        "tags",
        "array",
        false,
        "Теги для классификации",
        undefined,
        "Метаданные",
      ),
      f("entities", "array", false, "Сущности домена", "entity", "Содержимое"),
      f(
        "linkages",
        "array",
        false,
        "Связи между сущностями",
        "linkage",
        "Содержимое",
      ),
      f("trees", "array", false, "Деревья связей", undefined, "Содержимое"),
      f(
        "transitiveLinkages",
        "array",
        false,
        "Транзитивные связи",
        undefined,
        "Содержимое",
      ),
      f(
        "dataTypes",
        "array",
        false,
        "Пользовательские типы данных",
        undefined,
        "Содержимое",
      ),
      f(
        "sequences",
        "array",
        false,
        "Числовые последовательности",
        undefined,
        "Содержимое",
      ),
      f(
        "counterColorPattern",
        "array",
        false,
        "Цветовые схемы счётчиков",
        undefined,
        "Содержимое",
      ),
      f("mixins", "array", false, "Примеси", undefined, "Содержимое"),
      f("dataRules", "array", false, "Правила данных", undefined, "Содержимое"),
      f("actions", "array", false, "Действия", "action", "Содержимое"),
      f("medias", "array", false, "Иконки", undefined, "Содержимое"),
      f("views", "array", false, "Представления", "view", "Интерфейс"),
      f("menus", "array", false, "Меню домена", undefined, "Интерфейс"),
      f(
        "uiRules",
        "array",
        false,
        "Правила представлений",
        undefined,
        "Интерфейс",
      ),
      f("uiPresets", "array", false, "Пресеты UI", undefined, "Интерфейс"),
      f(
        "exchangeSettings",
        "object",
        false,
        "Настройки обмена данными",
        undefined,
        "Прочее",
      ),
      f("permissions", "array", false, "Разрешения", undefined, "Прочее"),
      f("accessRules", "array", false, "Правила доступа", undefined, "Прочее"),
    ],
  },

  entities: {
    title: "Сущности",
    description: "Массив сущностей домена.",
    docsAnchor: "entities",
    fields: [],
  },

  "entities[*]": {
    title: "Сущность",
    description: "Логическая модель объекта домена.",
    docsAnchor: "entity",
    fields: [
      f("id", "string", true, "Уникальный идентификатор сущности"),
      f("name", "string", false, "Название сущности"),
      f("description", "string", false, "Описание сущности"),
      f("label", "string", false, "Шаблон отображаемого названия"),
      f("attributes", "array", false, "Атрибуты сущности", "attribute"),
      f("sorting", "array", false, "Правила сортировки"),
      f("identification", "array", false, "Правила идентификации"),
      f("reconciliation", "array", false, "Правила реконсиляции"),
      f("projection", "array", false, "Проекции"),
      f("searching", "array", false, "Атрибуты поиска"),
      f("inherits", "ref", false, "Родительская сущность", "entity"),
      f("icons", "ref", false, "Иконка для диаграммы"),
      f("graphView", "object", false, "Настройки отображения на графе"),
      f("scanTarget", "boolean", false, "Признак актива для сканирования"),
      f(
        "scanTargetGroup",
        "boolean",
        false,
        "Признак группы активов для сканирования",
      ),
      f("kind", "string", false, "Вид сущности"),
    ],
  },

  "entities[*].attributes": {
    title: "Атрибуты сущности",
    description: "Массив атрибутов сущности.",
    docsAnchor: "attributes",
    fields: [],
  },

  "entities[*].attributes[*]": {
    title: "Атрибут",
    description: "Характеристика объекта.",
    docsAnchor: "attribute",
    fields: [
      f("id", "string", true, "Идентификатор атрибута"),
      f("name", "string", false, "Название атрибута"),
      f("description", "string", false, "Описание атрибута"),
      f("dataType", "ref", true, "Тип данных", "dataType"),
      f("constraints", "array", false, "Ограничения"),
      f("readonly", "boolean", false, "Только для чтения"),
      f("entity", "ref", false, "Сущность (для Reference)", "entity"),
      f("item", "object", false, "Параметры элемента (для Array)"),
      f("sequence", "ref", false, "Последовательность (для Identifier)"),
      f("template", "string", false, "Шаблон (для Identifier)"),
      f(
        "defaultPrefix",
        "string",
        false,
        "Префикс по умолчанию (для Identifier)",
      ),
      f(
        "incrementTemplate",
        "string",
        false,
        "Кол-во цифр в инкременте (для Identifier)",
      ),
      f("comments", "boolean", false, "Разрешить комментарии (для Text)"),
    ],
  },

  "linkages[*]": {
    title: "Связь",
    description: "Отношение между двумя сущностями.",
    docsAnchor: "linkage",
    fields: [
      f("id", "string", true, "Идентификатор связи"),
      f("name", "string", false, "Название связи"),
      f("description", "string", false, "Описание связи"),
      f("side1", "ref", true, "Первая сущность", "entity"),
      f("side2", "ref", true, "Вторая сущность", "entity"),
      f("type", "enum", true, "Тип связи", undefined, undefined, [
        "1_1",
        "1_n",
        "n_n",
      ]),
      f("undirected", "boolean", false, "Ненаправленная (только для n_n)"),
      f("nameFrom", "object", true, "Глагольные описания сторон"),
      f("useForSearch", "boolean", false, "Использовать в поиске"),
      f("attributes", "array", false, "Атрибуты связи"),
      f("sorting", "array", false, "Правила сортировки"),
      f("view", "object", false, "Отображение на графе"),
    ],
  },

  "views[*]": {
    title: "Представление",
    description: "Интерфейс объекта или списка объектов.",
    docsAnchor: "views",
    fields: [
      f("id", "string", true, "Идентификатор представления"),
      f("type", "enum", true, "Тип представления", undefined, undefined, [
        "entity",
        "list",
        "tabs_list",
        "tree",
        "dashboard",
        "dashboard_tree",
      ]),
      f(
        "isMixin",
        "boolean",
        false,
        "Использовать view как источник для примеси",
      ),
      f("label", "string", false, "Заголовок"),
      f("description", "string", false, "Описание"),
      f("entity", "ref", false, "Сущность (для type: entity)", "entity"),
      f("source", "object", false, "Источник списка (для type: list)"),
      f("table", "object", false, "Таблица (для type: list/tree)"),
      f("widgets", "array", false, "Виджеты (для entity / dashboard)"),
      f("groups", "array", false, "Группы виджетов (для type: entity)"),
      f("views", "array", false, "Карточки объекта (для type: entity)"),
      f("actionPanel", "array", false, "Панель действий (для type: list)"),
      f("inherits", "ref", false, "Наследование"),
      // tabs_list
      f("tabs", "array", false, "Вкладки (для type: tabs_list)"),
      f("defaultTab", "ref", false, "Вкладка по умолчанию (для tabs_list)"),
      // tree / dashboard_tree
      f("tree", "ref", false, "Дерево (для type: tree, dashboard_tree)"),
      f(
        "variant",
        "enum",
        false,
        "Вариант (для type: tree)",
        undefined,
        undefined,
        ["merged", "splitted"],
      ),
      f("list", "ref", false, "Список (для variant: splitted)"),
      f("catalogTitle", "string", false, "Заголовок каталога (для splitted)"),
      f("rootText", "string", false, "Название корневого узла (для splitted)"),
      f("nodeChunkSize", "number", false, "Размер подгрузки узлов"), // ← добавили
      f("ordering", "object", false, "Возможность менять порядок узлов"),
      f("reloadOnExpand", "boolean", false, "Перезагружать узлы при раскрытии"),
      f(
        "reloadStrategy",
        "string",
        false,
        "Стратегия перезагрузки: all | smart",
      ),
      f("showLeaf", "boolean", false, "Показывать листовые узлы"),
      f("treePath", "object", false, "Отображение пути"),
      // dashboard
      f("layout", "object", false, "Раскладка (для type: dashboard)"),
      // dashboard_tree
      f(
        "defaultItem",
        "ref",
        false,
        "Элемент по умолчанию (для dashboard_tree)",
      ),
    ],
  },

  "views[*].views[*]": {
    title: "Карточка объекта",
    description: "Панель, модальное окно или полноэкранная карточка.",
    docsAnchor: "entity-view",
    fields: [
      f("id", "string", true, "Идентификатор карточки"),
      f("type", "enum", true, "Тип карточки", undefined, undefined, [
        "panel",
        "modal",
        "page",
      ]),
      f("label", "string", false, "Заголовок"),
      f("description", "string", false, "Описание"),
      f("form", "ref", false, "Форма (для type: modal)"),
      f("tabs", "array", false, "Вкладки (для type: panel)"),
      f("block", "ref", false, "Блок (для type: page)"),
      f("menu", "array", false, "Меню (для type: panel)"),
    ],
  },
  "views[*].widgets[*]": {
    title: "Виджет",
    description: "Визуальный компонент интерфейса.",
    docsAnchor: "widget",
    fields: [
      f("id", "string", true, "Идентификатор виджета"),
      f("type", "enum", true, "Тип виджета", undefined, undefined, [
        "attribute",
        "action",
        "linkage",
        "linkage_list",
        "linked_objects_groups",
        "join",
        "visualization",
        "history",
        "runs_history",
        "comments",
        "card",
        "conversation",
        "addressBook",
        "calculation",
      ]),
      f("description", "string", false, "Описание"),
      f("label", "string", false, "Заголовок в UI"),
      f("attribute", "ref", false, "Атрибут", "attribute"),
      f("action", "ref", false, "Действие", "action"),
      f("actions", "array", false, "Массив действий"),
      f("linkage", "ref", false, "Связь", "linkage"),
      f("side", "number", false, "Сторона связи"),
      f("attributes", "array", false, "Атрибуты связи"),
      f("control", "object", false, "Элемент управления"),
      f("columns", "array", false, "Колонки таблицы"),
      f("addLinksView", "ref", false, "Представление для добавления связей"),
      f("rules", "object", false, "Правила включения/исключения связей"), // ← для linkage_list
      f("counterColorPattern", "ref", false, "Цветовая схема счётчика"),
      f("eventStorageId", "string", false, "ID хранилища событий"),
      f("scenarios", "object", false, "Настройки сценариев"),
      f("conversationTransports", "array", false, "Транспорты переписок"),
      f("name", "string", false, "Название визуализации"),
      f("variables", "object", false, "Параметры визуализации"),
      f("tree", "ref", false, "Дерево"),
      f("linkages", "array", false, "Связи"),
      f("groupingBy", "array", false, "Атрибуты группировки"),
      f("joins", "array", false, "Транзитивные связи"),
      f(
        "displayMode",
        "enum",
        false,
        "Режим отображения",
        undefined,
        undefined,
        ["flat", "grouped"],
      ),
      f("paging", "object", false, "Пагинация"),
      f("sortingBy", "object", false, "Сортировка"),
      f("joinId", "ref", false, "Идентификатор транзитивной связи"),
      f("aggregate", "object", false, "Агрегация"),
      f("openView", "ref", false, "Действие открытия списочного представления"),
      f("editable", "boolean", false, "Разрешить редактирование"),
      f("readonly", "boolean", false, "Только для чтения"),
    ],
  },

  "views[*].groups[*]": {
    title: "Группа виджетов",
    description: "Блок, вкладка или форма.",
    docsAnchor: "group",
    fields: [
      f("id", "string", true, "Идентификатор группы"),
      f("type", "enum", true, "Тип группы", undefined, undefined, [
        "block",
        "tab",
        "form",
        "tabs",
        "resizable_block_pair",
      ]),
      f("label", "string", false, "Заголовок"),
      f("description", "string", false, "Описание"),
      f("components", "array", false, "Компоненты"),
      f("inherits", "ref", false, "Наследование"),
      f("layout", "object", false, "Настройки взаимного расположения"),
    ],
  },

  "actions[*]": {
    title: "Действие",
    description: "Операция над объектами домена.",
    docsAnchor: "action",
    fields: [
      f("id", "string", true, "Идентификатор действия"),
      f("name", "string", false, "Название действия"),
      f("description", "string", false, "Описание действия"),
      f("type", "enum", true, "Тип действия", undefined, undefined, [
        "open_panel",
        "open_modal",
        "open_page",
        "open_list",
        "open_tree",
        "open_view",
        "open_graph_view",
        "remove",
        "bulk",
        "tree_bulk",
        "set_attribute_value",
        "automation",
        "scenario",
      ]),
      f("entity", "ref", false, "Сущность", "entity"),
      f("operation", "enum", false, "Операция", undefined, undefined, [
        "create",
        "edit",
        "view",
        "remove",
        "edit_attribute",
      ]),
      f("modal", "ref", false, "Модальное окно (для open_modal)", "view"),
      f("panel", "ref", false, "Панель (для open_panel)", "view"),
      f("view", "ref", false, "Представление", "view"),
      f("scenario", "string", false, "Идентификатор сценария (для scenario)"),
      f("workerTag", "string", false, "Тег воркера (для scenario)"),
      f("automation", "object", false, "Автоматизация (для automation)"),
      f("hooks", "object", false, "Обработчики событий сценария"),
      f(
        "values",
        "array",
        false,
        "Значения атрибутов (для set_attribute_value)",
      ),
      f(
        "linkage",
        "ref",
        false,
        "Связь (для open_list с контекстом)",
        "linkage",
      ),
      f("side", "number", false, "Сторона связи (для open_list)"),
      f("join", "ref", false, "Транзитивная связь (для open_list)"),
      f("page", "string", false, "Окно отображения: blank | current"),
      f("contextPin", "boolean", false, "Запретить удаление контекста"),
      f(
        "attribute",
        "ref",
        false,
        "Атрибут-ссылка (для open_list)",
        "attribute",
      ),
      f("widgetId", "ref", false, "Идентификатор виджета", "view"),
      f("operation_id", "string", false, "Идентификатор операции"),
      f("params", "object", false, "Параметры действия"),
    ],
  },

  "menus[*]": {
    title: "Меню",
    description: "Пункт меню домена.",
    docsAnchor: "menu",
    fields: [
      f("id", "string", true, "Идентификатор меню"),
      f("route", "string", true, "Путь в адресной строке"),
      f("label", "string", true, "Отображаемое название"),
      f("type", "enum", true, "Тип меню", undefined, undefined, [
        "root_group",
        "root_menu",
      ]),
      f("placement", "enum", false, "Расположение", undefined, undefined, [
        "top",
        "settings",
      ]),
      f("icon", "ref", false, "Иконка", undefined, "Интерфейс"),
      f("description", "string", false, "Описание"),
      f("priority", "number", false, "Приоритет в меню"),
      f("view", "ref", false, "Ссылка на представление", "view"),
      f("items", "array", false, "Дочерние пункты меню"),
      f("default", "string", false, "Элемент меню по умолчанию"),
    ],
  },

  "menus[*].items[*]": {
    title: "Пункт меню",
    description: "Дочерний элемент корневой группы меню.",
    docsAnchor: "menu-item",
    fields: [
      f("id", "string", true, "Идентификатор пункта меню"),
      f("route", "string", true, "Путь в адресной строке"),
      f("label", "string", true, "Отображаемое название"),
      f("type", "enum", true, "Тип", undefined, undefined, ["menu"]),
      f("view", "ref", false, "Ссылка на представление", "view"),
      f("icon", "ref", false, "Иконка", undefined, "Интерфейс"),
      f("description", "string", false, "Описание"),
      f("priority", "number", false, "Приоритет в меню"),
      f("placement", "enum", false, "Расположение", undefined, undefined, [
        "top",
        "settings",
      ]),
    ],
  },

  "dataTypes[*]": {
    title: "Пользовательский тип данных",
    description: "Enum, Workflow или Table.",
    docsAnchor: "dataTypes",
    fields: [
      f("id", "string", true, "Идентификатор типа"),
      f("name", "string", false, "Название типа"),
      f("description", "string", false, "Описание"),
      f("dataType", "enum", true, "Вид типа", undefined, undefined, [
        "Enum",
        "Workflow",
        "Table",
      ]),
      f("values", "array", false, "Значения (для Enum)"),
      f("statuses", "array", false, "Статусы (для Workflow)"),
      f("initial", "string", false, "Начальный статус (для Workflow)"),
      f("transitions", "array", false, "Переходы (для Workflow)"),
      f("attributes", "array", false, "Колонки (для Table)"),
      f("maxRows", "number", false, "Максимум строк (для Table)"),
      f("sorting", "array", false, "Правила сортировки (для Table)"),
      f("view", "object", false, "Настройки отображения (цвета, колонки)"),
      f("columnOrder", "array", false, "Порядок колонок"),
      f("hidden", "boolean", false, "Скрыть тип"),
    ],
  },

  "dataRules[*]": {
    title: "Правило данных",
    description: "Ограничение или предписание для атрибутов.",
    docsAnchor: "dataRules",
    fields: [
      f("id", "string", true, "Идентификатор правила"),
      f("name", "string", false, "Название"),
      f("description", "string", false, "Описание"),
      f("target", "enum", true, "Объект правила", undefined, undefined, [
        "entity",
        "entityAttribute",
        "linkage",
      ]),
      f("entity", "ref", false, "Сущность", "entity"),
      f("linkage", "ref", false, "Связь", "linkage"),
      f("attribute", "ref", false, "Атрибут", "attribute"),
      f("condition", "string", true, "Условие (RQL)"),
      f("rule", "object", true, "Действие правила"),
      f("message", "string", false, "Сообщение об ошибке"),
      f("help", "string", false, "Подсказка"),
    ],
  },

  "dataRules[*].rule": {
    title: "Действие правила",
    description: "Что делается с атрибутом/связью при выполнении условия.",
    fields: [
      f("effect", "enum", true, "Эффект", undefined, undefined, [
        "hidden",
        "readonly",
        "required",
        "default",
        "allowed",
      ]),
      f("attributes", "array", false, "Атрибуты (для target: entity)"),
      f("linkages", "array", false, "Связи (для target: entity, linkage)"),
      f(
        "nested",
        "object",
        false,
        "Вложенные элементы (для таблиц и массивов)",
      ),
    ],
  },

  "dataRules[*].rule.attributes[*]": {
    title: "Атрибут правила",
    description: "Атрибут, к которому применяется эффект.",
    fields: [
      f("attribute", "ref", true, "Атрибут", "attribute"),
      f("value", "object", false, "Значение (для effect: default)"),
      f("expression", "string", false, "RQL-выражение (для default/allowed)"),
      f("constraint", "string", false, "Условие (для effect: allowed)"),
      f("message", "string", false, "Сообщение об ошибке"),
      f("help", "string", false, "Подсказка"),
    ],
  },

  "dataRules[*].rule.linkages[*]": {
    title: "Связь правила",
    description: "Связь, к которой применяется эффект.",
    fields: [
      f("linkage", "ref", true, "Связь", "linkage"),
      f("side", "number", false, "Сторона связи (1 или 2)"),
      f("min_count", "number", false, "Минимальное количество связей"),
      f("max_count", "number", false, "Максимальное количество связей"),
      f("constraint", "string", false, "Условие (для effect: allowed)"),
      f("expression", "string", false, "RQL-выражение (для default/allowed)"),
      f("message", "string", false, "Сообщение об ошибке"),
      f("help", "string", false, "Подсказка"),
    ],
  },

  "dataRules[*].rule.nested": {
    title: "Вложенные элементы правила",
    description: "Для атрибутов типа Table и Array.",
    fields: [
      f("type", "enum", true, "Тип", undefined, undefined, ["table", "array"]),
      f("attributes", "array", false, "Колонки таблицы"),
      f("items", "array", false, "Элементы массива"),
    ],
  },

  /* ------------------------------------------------------------------ */
  /*                    Миксины                                          */
  /* ------------------------------------------------------------------ */

  "mixins[*]": {
    title: "Примесь",
    description:
      "Механизм расширения сущностей: встраивает данные или интерфейсные элементы из другой сущности или домена.",
    docsAnchor: "mixins",
    fields: [
      f("id", "string", true, "Идентификатор примеси"),
      f("name", "string", false, "Название примеси"),
      f("description", "string", false, "Описание"),
      f("type", "enum", true, "Тип подмешивания", undefined, undefined, [
        "linkage",
        "view",
      ]),
      f("weight", "number", false, "Приоритет (меньше — выше)"),
      f("useForChild", "boolean", false, "Применять к дочерним сущностям"),
      f("entity", "object", false, "Сущность-источник или целевая сущность"),
      f("linkage", "ref", false, "Связь (для type: linkage)", "linkage"),
      f(
        "showMixinInHistory",
        "boolean",
        false,
        "Показывать историю в целевом объекте",
      ),
      f("views", "array", false, "Встраиваемые представления"),
    ],
  },

  "mixins[*].entity": {
    title: "Сущность примеси",
    description:
      "Для linkage — объект с полями from/to, для view — строка с id сущности.",
    fields: [
      f("from", "ref", false, "Источник примеси (для linkage)", "entity"),
      f("to", "ref", false, "Целевая сущность (для linkage)", "entity"),
    ],
  },

  "mixins[*].views[*]": {
    title: "Компонент примеси",
    description:
      "Встраиваемый компонент интерфейса (панель, вкладка, форма, список, page).",
    fields: [
      f("id", "string", true, "Идентификатор примеси компонента"),
      f(
        "type",
        "enum",
        true,
        "Тип встраиваемого представления",
        undefined,
        undefined,
        ["panel", "tab", "form", "list", "page"],
      ),
      f("fromView", "ref", false, "Источник (для примесей type: view)"),
      f("to", "object", false, "Целевой компонент"),
      f("change", "object", false, "Изменения (add/delete)"),
      f("replace", "object", false, "Замена компонентов"),
    ],
  },

  "mixins[*].views[*].to": {
    title: "Целевой компонент",
    description: "Куда встраивается компонент примеси.",
    fields: [
      f("panel", "ref", false, "ID целевой панели"),
      f("tab", "ref", false, "ID целевой вкладки"),
      f("form", "ref", false, "ID целевой формы"),
      f("list", "ref", false, "ID целевого списка"),
      f("page", "ref", false, "ID целевой page-карточки"),
    ],
  },

  "mixins[*].views[*].change": {
    title: "Изменения примеси",
    description: "Что добавляется и что удаляется в целевом компоненте.",
    fields: [
      f("add", "object", false, "Добавляемые компоненты"),
      f("delete", "object", false, "Удаляемые компоненты"),
    ],
  },

  "mixins[*].views[*].replace": {
    title: "Замена компонента",
    description:
      "Компоненты, которыми заменяются компоненты целевого представления.",
    fields: [
      f("panel", "ref", false, "ID панели"),
      f("tab", "ref", false, "ID вкладки"),
      f("form", "ref", false, "ID формы"),
      f("list", "ref", false, "ID списка"),
      f("page", "ref", false, "ID page-карточки"),
      f("block", "ref", false, "ID блока"),
      f("tabs", "array", false, "Массив вкладок"),
      f("actionPanel", "array", false, "Массив виджетов"),
      f("components", "array", false, "Компоненты"),
    ],
  },

  "uiRules[*]": {
    title: "UI-правило",
    description: "Правило управления представлениями.",
    docsAnchor: "uiRules",
    fields: [
      f("id", "string", true, "Идентификатор правила"),
      f("name", "string", false, "Название"),
      f("description", "string", false, "Описание"),
      f("target", "enum", true, "Объект применения", undefined, undefined, [
        "entity_view",
        "list_view",
        "entity_attribute",
      ]),
      f("view", "ref", true, "Представление", "view"),
      f("condition", "string", false, "Условие (RQL)"),
      f("rule", "object", true, "Правило"),
    ],
  },

  "sequences[*]": {
    title: "Последовательность",
    description: "Числовая последовательность для Identifier.",
    docsAnchor: "sequences",
    fields: [
      f("id", "string", true, "Идентификатор последовательности"),
      f("startFrom", "number", false, "Начальное значение"),
      f("description", "string", false, "Описание"),
    ],
  },
};

/* ------------------------------------------------------------------ */
/*                           Функции                                  */
/* ------------------------------------------------------------------ */

/**
 * Находит узел схемы по пути курсора.
 * Если курсор стоит на конкретном поле (скаляре), возвращает родительский
 * блок и имя поля.
 *
 * Примеры:
 *   []                                      → корень
 *   ['entities', 0]                         → entities[*]
 *   ['entities', 0, 'attributes', 2]        → entities[*].attributes[*]
 *   ['entities', 0, 'attributes', 2, 'dataType'] → entities[*].attributes[*], fieldName='dataType'
 */
/**
 * Ключи-массивы в схеме. Если после такого ключа идёт строковый
 * сегмент — это id элемента массива, а не вложенный ключ.
 */
const ARRAY_KEYS = new Set([
  "entities",
  "linkages",
  "views",
  "widgets",
  "groups",
  "actions",
  "menus",
  "items",
  "dataTypes",
  "sequences",
  "mixins",
  "dataRules",
  "uiRules",
  "uiPresets",
  "medias",
  "trees",
  "transitiveLinkages",
  "attributes",
  "values",
  "statuses",
  "transitions",
  "counterColorPattern",
  "views",
  "tabs",
  "components",
]);

/**
 * Приводит путь к «схемному» виду.
 *   ['entities', 'Device']                          → ['entities', '*']
 *   ['entities', 'Device', 'attributes']            → ['entities', '*', 'attributes']
 *   ['entities', 'Device', 'attributes', 'name']    → ['entities', '*', 'attributes', '*']
 *   ['entities', 0, 'attributes', 2]                → ['entities', '*', 'attributes', '*']
 */
function normalizePath(path: (string | number)[]): (string | number)[] {
  const result: (string | number)[] = [];
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const prev = result[result.length - 1];
    if (
      typeof seg === "string" &&
      typeof prev === "string" &&
      ARRAY_KEYS.has(prev)
    ) {
      result.push("*");
    } else {
      result.push(seg);
    }
  }
  return result;
}

export function resolveSchemaNode(
  path: (string | number)[],
): { node: SchemaNode; fieldName: string | null } | null {
  if (path.length === 0) {
    const node = schemaMetadata[""];
    return node ? { node, fieldName: null } : null;
  }

  // нормализуем путь: id элементов массивов → '*'
  const normalized = normalizePath(path);

  const fullKey = pathToKey(normalized);
  if (schemaMetadata[fullKey]) {
    return { node: schemaMetadata[fullKey], fieldName: null };
  }

  const lastSeg = normalized[normalized.length - 1];
  const parentPath = normalized.slice(0, -1);
  const parentKey = pathToKey(parentPath);
  const parentNode = schemaMetadata[parentKey];

  if (parentNode && typeof lastSeg === "string") {
    return { node: parentNode, fieldName: lastSeg };
  }

  // fallback: ближайший известный предок
  for (let i = normalized.length - 1; i >= 0; i--) {
    const key = pathToKey(normalized.slice(0, i));
    const node = schemaMetadata[key];
    if (node) return { node, fieldName: null };
  }

  return null;
}

/**
 * Преобразует путь в ключ метаданных.
 *   []                                  → ''
 *   ['entities']                        → 'entities'
 *   ['entities', 0]                     → 'entities[*]'
 *   ['entities', 0, 'attributes', 2]    → 'entities[*].attributes[*]'
 */
export function pathToKey(path: (string | number)[]): string {
  let result = "";
  for (const seg of path) {
    if (typeof seg === "number" || seg === "*") {
      result += "[*]";
    } else {
      result += (result ? "." : "") + seg;
    }
  }
  return result;
}

/**
 * Возвращает описание поля внутри узла схемы по имени.
 */
export function findField(
  node: SchemaNode,
  name: string,
): SchemaField | undefined {
  return node.fields.find((f) => f.name === name);
}

/**
 * Возвращает список полей, сгруппированных по group.
 * Используется инспектором для красивого отображения.
 */
export function groupFields(
  fields: SchemaField[],
): Record<string, SchemaField[]> {
  const out: Record<string, SchemaField[]> = {};
  for (const f of fields) {
    const group = f.group ?? "Прочее";
    if (!out[group]) out[group] = [];
    out[group].push(f);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*                       Вспомогательные                              */
/* ------------------------------------------------------------------ */

function f(
  name: string,
  type: SchemaFieldType,
  required?: boolean,
  description?: string,
  refTo?: SchemaField["refTo"],
  group?: string,
  values?: string[],
): SchemaField {
  return {
    name,
    type,
    required,
    description,
    refTo,
    group,
    values,
  };
}
/**
 * Алиас для обратной совместимости с unknownKeys.ts.
 * Возвращает схему узла по пути (без имени поля).
 */
export function getNodeMeta(path: (string | number)[]): SchemaNode | null {
  const key = pathToKey(path);
  return schemaMetadata[key] ?? null;
}
