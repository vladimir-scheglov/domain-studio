import { wizardRegistry } from "@/services/wizardRegistry";
import { useDocumentStore } from "@/store/documentStore";

/* ------------------------------------------------------------------ */
/*                          Утилиты                                    */
/* ------------------------------------------------------------------ */

function readParsed(): Record<string, unknown> {
  const parsed = useDocumentStore.getState().parsed;
  if (typeof parsed !== "object" || parsed === null) return {};
  return parsed as Record<string, unknown>;
}

function readArray(key: string): Array<Record<string, unknown>> {
  const parsed = readParsed();
  const arr = parsed[key];
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (x): x is Record<string, unknown> => typeof x === "object" && x !== null,
  );
}

function findView(viewId: string): Record<string, unknown> | null {
  return readArray("views").find((v) => v.id === viewId) ?? null;
}

function viewLabel(viewId: string): string {
  const v = findView(viewId);
  return String(v?.label ?? viewId);
}

function findEntity(entityId: string): Record<string, unknown> | null {
  return readArray("entities").find((e) => e.id === entityId) ?? null;
}

// @ts-expect-error dsds
function pickEntityColumns(
  entityId: string,
  max = 5,
): Array<{ id: string; name: string }> {
  const entity = findEntity(entityId);
  const attrs = Array.isArray(entity?.attributes)
    ? (entity!.attributes as Array<Record<string, unknown>>)
    : [];
  const filtered = attrs.filter((a) => {
    const dt = String(a.dataType ?? "");
    return dt !== "Text" && dt !== "Attachment" && dt !== "Table";
  });
  return filtered.slice(0, max).map((a) => ({
    id: String(a.id),
    name: String(a.name ?? a.id),
  }));
}

/* ------------------------------------------------------------------ */
/*                      1. Tabs list                                   */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "view.tabs_list",
  title: "Вкладки со списками",
  description: "Группа вкладок, каждая содержит списочное представление",
  category: "view",
  command: "view.tabs_list",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "id",
          label: "ID представления",
          type: "text",
          required: true,
          placeholder: "tabs_dashboard",
        },
        {
          name: "label",
          label: "Заголовок",
          type: "text",
          placeholder: "Обзор",
        },
        {
          name: "tabs",
          label: "Списочные представления",
          type: "multiselect",
          dynamicOptions: "listViews",
          required: true,
          help: "Выберите list-представления, которые станут вкладками",
        },
        {
          name: "defaultTab",
          label: "Вкладка по умолчанию",
          type: "text",
          placeholder: "lists_devices",
          help: "ID одной из выбранных вкладок",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры, _" };
        }
        const tabs = Array.isArray(values.tabs) ? values.tabs : [];
        if (tabs.length === 0) {
          return { tabs: "Выберите хотя бы одну вкладку" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const label = String(values.label ?? "").trim();
    const tabs = (Array.isArray(values.tabs) ? values.tabs : []) as string[];
    let defaultTab = String(values.defaultTab ?? "").trim();

    if (!defaultTab || !tabs.includes(defaultTab)) {
      defaultTab = tabs[0] ?? "";
    }

    const lines: string[] = ["views:"];
    lines.push(`  - id: ${id}`);
    lines.push(`    type: tabs_list`);
    if (label) lines.push(`    label: "${label}"`);
    lines.push(`    tabs:`);
    for (const t of tabs) {
      lines.push(`      - view: ${t}`);
    }
    if (defaultTab) {
      lines.push(`    defaultTab: ${defaultTab}`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать ${tabs.length} вкладок в «${label || id}»`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      2. Dashboard                                   */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "view.dashboard",
  title: "Дашборд с плитками",
  description: "Группа карточек-плиток с переходами к спискам",
  category: "view",
  command: "view.dashboard",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "id",
          label: "ID дашборда",
          type: "text",
          required: true,
          placeholder: "dashboard_main",
        },
        {
          name: "label",
          label: "Заголовок",
          type: "text",
          placeholder: "Главная",
        },
        {
          name: "cards",
          label: "Карточки (list-представления)",
          type: "multiselect",
          dynamicOptions: "listViews",
          required: true,
          help: "По каждой выбранной view будет создана плитка с переходом",
        },
        {
          name: "columns",
          label: "Колонок в сетке",
          type: "number",
          defaultValue: 3,
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры, _" };
        }
        const cards = Array.isArray(values.cards) ? values.cards : [];
        if (cards.length === 0) {
          return { cards: "Выберите хотя бы одну карточку" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const label = String(values.label ?? "").trim();
    const cards = (Array.isArray(values.cards) ? values.cards : []) as string[];
    const columns = Number(values.columns ?? 3) || 3;

    const parts: string[] = [];

    /* ------- 1) actions: open_view для каждой карточки ------- */
    const actions: string[] = ["actions:"];
    for (const c of cards) {
      actions.push(`  - id: actions_open_${c}`);
      actions.push(`    name: Открыть ${viewLabel(c)}`);
      actions.push(`    type: open_view`);
      actions.push(`    view: ${c}`);
    }
    parts.push(actions.join("\n"));

    /* ------- 2) dashboard с определениями карточек ВНУТРИ ------- */
    const viewLines: string[] = ["views:"];
    viewLines.push(`  - id: ${id}`);
    viewLines.push(`    type: dashboard`);
    if (label) viewLines.push(`    label: "${label}"`);
    viewLines.push(`    widgets:`);
    for (const c of cards) {
      viewLines.push(`      - id: card_${c}`);
      viewLines.push(`        type: card`);
      viewLines.push(`        label: "${viewLabel(c)}"`);
      viewLines.push(`        action: actions_open_${c}`);
    }
    viewLines.push(`    layout:`);
    viewLines.push(`      type: grid`);
    viewLines.push(`      columns: ${columns}`);
    parts.push(viewLines.join("\n"));

    return {
      yaml: parts.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать дашборд с ${cards.length} карточками`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      3. Tree view                                   */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "view.tree",
  title: "Древовидное представление",
  description: "Каталог с деревом иерархических связей",
  category: "view",
  command: "view.tree",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "id",
          label: "ID представления",
          type: "text",
          required: true,
          placeholder: "tree_devices",
        },
        {
          name: "tree",
          label: "Дерево",
          type: "select",
          dynamicOptions: "existingTrees",
          required: true,
          help: "Существующее дерево из секции trees",
        },
        {
          name: "variant",
          label: "Вариант",
          type: "select",
          defaultValue: "merged",
          options: [
            {
              value: "merged",
              label: "merged — дерево в списочном представлении",
            },
            {
              value: "splitted",
              label: "splitted — каталог в двух окнах",
            },
          ],
        },
        {
          name: "list",
          label: "Список (для variant=splitted)",
          type: "select",
          dynamicOptions: "listViews",
          help: "Обязательно при variant=splitted",
        },
        {
          name: "catalogTitle",
          label: "Заголовок каталога (для splitted)",
          type: "text",
          placeholder: "Элементы",
        },
        {
          name: "rootText",
          label: "Название корневого узла (для splitted)",
          type: "text",
          placeholder: "Все элементы",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры, _" };
        }
        if (!values.tree) return { tree: "Укажите дерево" };
        if (values.variant === "splitted" && !values.list) {
          return { list: "Для splitted укажите список" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const treeId = String(values.tree ?? "").trim();
    const variant = String(values.variant ?? "merged");
    const listId = String(values.list ?? "").trim();

    const lines: string[] = ["views:"];
    lines.push(`  - id: ${id}`);
    lines.push(`    type: tree`);
    lines.push(`    variant: ${variant}`);
    lines.push(`    tree: ${treeId}`);

    if (variant === "splitted") {
      if (listId) lines.push(`    list: ${listId}`);
      const catalogTitle = String(values.catalogTitle ?? "").trim();
      if (catalogTitle) lines.push(`    catalogTitle: "${catalogTitle}"`);
      const rootText = String(values.rootText ?? "").trim();
      if (rootText) lines.push(`    rootText: "${rootText}"`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать дерево «${id}» (${variant})`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      4. Dashboard tree                              */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "view.dashboard_tree",
  title: "Навигация (dashboard_tree)",
  description: "Дерево навигации по дашбордам и спискам",
  category: "view",
  command: "view.dashboard_tree",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "id",
          label: "ID навигации",
          type: "text",
          required: true,
          placeholder: "nav_main",
        },
        {
          name: "items",
          label: "Элементы навигации",
          type: "multiselect",
          dynamicOptions: "allViews",
          required: true,
          help: "Дашборды, списки, деревья — всё, что должно быть в дереве",
        },
        {
          name: "defaultItem",
          label: "Элемент по умолчанию",
          type: "text",
          placeholder: "dashboard_main",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры, _" };
        }
        const items = Array.isArray(values.items) ? values.items : [];
        if (items.length === 0) {
          return { items: "Выберите хотя бы один элемент" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const items = (Array.isArray(values.items) ? values.items : []) as string[];
    let defaultItem = String(values.defaultItem ?? "").trim();

    if (!defaultItem || !items.includes(defaultItem)) {
      defaultItem = items[0] ?? "";
    }

    const lines: string[] = ["views:"];
    lines.push(`  - id: ${id}`);
    lines.push(`    type: dashboard_tree`);
    lines.push(`    tree:`);
    for (const it of items) {
      const v = findView(it);
      const label = String(v?.label ?? it);
      lines.push(`      - view: ${it}`);
      lines.push(`        label: "${label}"`);
    }
    if (defaultItem) {
      lines.push(`    defaultItem: ${defaultItem}`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать навигацию с ${items.length} элементами`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      5. Full navigation pack                        */
/* ------------------------------------------------------------------ */

/**
 * Композиция: создаёт tabs_list из всех list, dashboard из всех list,
 * dashboard_tree со всеми этими view и root-меню.
 */
wizardRegistry.register({
  id: "scenario.navigationPack",
  title: "Пакет навигации (dashboard + tabs + menu)",
  description:
    "Автоматически строит дашборд, вкладки и меню из существующих list-представлений",
  category: "scenario",
  command: "scenario.navigationPack",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "menuRoute",
          label: "Route меню",
          type: "text",
          required: true,
          placeholder: "/dashboard",
        },
        {
          name: "menuLabel",
          label: "Заголовок меню",
          type: "text",
          required: true,
          placeholder: "Обзор",
        },
        {
          name: "withTabs",
          label: "Создать tabs_list из всех списков",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withDashboard",
          label: "Создать dashboard из всех списков",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withDashboardTree",
          label: "Создать dashboard_tree",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withMenu",
          label: "Создать пункт меню",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values): Record<string, string> | null => {
        const route = String(values.menuRoute ?? "").trim();
        if (!/^\/[a-z0-9-]+$/.test(route)) {
          return {
            menuRoute: "Route: /латиница-нижний-регистр-и-цифры",
          };
        }
        if (!String(values.menuLabel ?? "").trim()) {
          return { menuLabel: "Укажите заголовок" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const menuRoute = String(values.menuRoute ?? "").trim();
    const menuLabel = String(values.menuLabel ?? "").trim();
    const withTabs = Boolean(values.withTabs);
    const withDashboard = Boolean(values.withDashboard);
    const withDashboardTree = Boolean(values.withDashboardTree);
    const withMenu = Boolean(values.withMenu);

    const listViews = readArray("views").filter(
      (v) => v.type === "list" && typeof v.id === "string",
    );

    if (listViews.length === 0) {
      return {
        yaml: "# Нет list-представлений в документе. Сначала сгенерируйте их через CRUD.",
        mergeStrategy: "merge",
        summary: "Нет списков для пакета навигации",
      };
    }

    const listIds = listViews.map((v) => String(v.id));
    const parts: string[] = [];

    // Dashboard + его actions/widgets
    if (withDashboard) {
      const acts: string[] = ["actions:"];
      for (const v of listViews) {
        const id = String(v.id);
        acts.push(`  - id: actions_open_${id}`);
        acts.push(`    name: Открыть ${String(v.label ?? id)}`);
        acts.push(`    type: open_view`);
        acts.push(`    view: ${id}`);
      }
      parts.push(acts.join("\n"));
    }
    // Views
    const viewEntries: string[] = [];

    if (withTabs) {
      const tabsLines: string[] = [];
      tabsLines.push(`  - id: tabs_navigation`);
      tabsLines.push(`    type: tabs_list`);
      tabsLines.push(`    label: "${menuLabel}"`);
      tabsLines.push(`    tabs:`);
      for (const id of listIds) {
        tabsLines.push(`      - view: ${id}`);
      }
      tabsLines.push(`    defaultTab: ${listIds[0]}`);
      viewEntries.push(tabsLines.join("\n"));
    }

    if (withDashboard) {
      const dashLines: string[] = [];
      dashLines.push(`  - id: dashboard_navigation`);
      dashLines.push(`    type: dashboard`);
      dashLines.push(`    label: "${menuLabel}"`);
      dashLines.push(`    widgets:`);
      for (const v of listViews) {
        const id = String(v.id);
        dashLines.push(`      - id: card_${id}`);
        dashLines.push(`        type: card`);
        dashLines.push(`        label: "${String(v.label ?? id)}"`);
        dashLines.push(`        action: actions_open_${id}`);
      }
      dashLines.push(`    layout:`);
      dashLines.push(`      type: grid`);
      dashLines.push(`      columns: 3`);
      viewEntries.push(dashLines.join("\n"));
    }

    if (withDashboardTree) {
      const treeLines: string[] = [];
      treeLines.push(`  - id: nav_navigation`);
      treeLines.push(`    type: dashboard_tree`);
      treeLines.push(`    tree:`);
      if (withDashboard) {
        treeLines.push(`      - view: dashboard_navigation`);
        treeLines.push(`        label: "${menuLabel}"`);
      }
      for (const v of listViews) {
        const id = String(v.id);
        treeLines.push(`      - view: ${id}`);
        treeLines.push(`        label: "${String(v.label ?? id)}"`);
      }
      treeLines.push(
        `    defaultItem: ${
          withDashboard ? "dashboard_navigation" : listIds[0]
        }`,
      );
      viewEntries.push(treeLines.join("\n"));
    }

    if (viewEntries.length > 0) {
      parts.push(["views:", ...viewEntries].join("\n"));
    }

    // Menu
    if (withMenu) {
      const menuLines: string[] = ["menus:"];
      menuLines.push(`  - id: menus_navigation`);
      menuLines.push(`    route: ${menuRoute}`);
      menuLines.push(`    label: "${menuLabel}"`);
      menuLines.push(`    type: root_group`);
      menuLines.push(`    placement: top`);
      menuLines.push(`    items:`);
      menuLines.push(`      - id: menu_navigation_main`);
      menuLines.push(`        route: ${menuRoute}/main`);
      menuLines.push(`        label: "${menuLabel}"`);
      menuLines.push(`        type: menu`);
      const targetView = withDashboardTree
        ? "nav_navigation"
        : withTabs
          ? "tabs_navigation"
          : listIds[0];
      menuLines.push(`        view: ${targetView}`);
      parts.push(menuLines.join("\n"));
    }

    return {
      yaml: parts.join("\n"),
      mergeStrategy: "merge",
      summary: `Пакет навигации из ${listIds.length} списков`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      6. Полноэкранная карточка                      */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: 'view.page',
  title: 'Полноэкранная карточка',
  description: 'Отдельная страница для просмотра/редактирования объекта',
  category: 'view',
  command: 'view.page',

  steps: [
    {
      id: 'main',
      title: 'Параметры',
      fields: [
        {
          name: 'id',
          label: 'ID представления',
          type: 'text',
          required: true,
          placeholder: 'page_device',
        },
        {
          name: 'entityId',
          label: 'Сущность',
          type: 'entity-ref',
          required: true,
        },
        {
          name: 'menuItem',
          label: 'ID элемента меню',
          type: 'text',
          required: true,
          placeholder: 'menu_devices',
          help: 'Используется для формирования URL и подсветки меню',
        },
        {
          name: 'viewId',
          label: 'ID entity-view',
          type: 'text',
          placeholder: 'viewDevice',
          help: 'Существующая entity view, из которой берутся widget/группы',
        },
        {
          name: 'blockOrTabs',
          label: 'Тип наполнения',
          type: 'select',
          defaultValue: 'tabs',
          options: [
            { value: 'tabs', label: 'Вкладки' },
            { value: 'block', label: 'Один блок' },
          ],
        },
        {
          name: 'container',
          label: 'ID группы',
          type: 'text',
          placeholder: 'tabs_infoDevice',
          help: 'ID группы типа tabs или block',
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? '').trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: 'Только латиница, цифры, _' };
        }
        if (!values.menuItem) return { menuItem: 'Укажите элемент меню' };
        if (!values.container) return { container: 'Укажите ID группы' };
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? '').trim();
    const entityId = String(values.entityId ?? '').trim();
    const menuItem = String(values.menuItem ?? '').trim();
    const viewId = String(values.viewId ?? '').trim();
    const kind = String(values.blockOrTabs ?? 'tabs');
    const container = String(values.container ?? '').trim();

    // Первая часть: добавляем в существующую entity view новую inner-view type=page
    // Вторая часть: сама page генерируется в блоке views как часть entity view.
    // Здесь просто встраиваем page в заданную entity view.
    const parts: string[] = [];

    if (viewId) {
      // встроить page в entity view
      const innerPage: string[] = [];
      innerPage.push(`      - id: ${id}`);
      innerPage.push(`        type: page`);
      innerPage.push(`        menuItem: ${menuItem}`);
      if (kind === 'block') {
        innerPage.push(`        block: ${container}`);
      } else {
        innerPage.push(`        tabs:`);
        innerPage.push(`          - tab: ${container}`);
      }

      parts.push(
        [
          'views:',
          `  - id: ${viewId}`,
          `    views:`,
          ...innerPage,
        ].join('\n')
      );
    }

    void entityId;

    return {
      yaml: parts.join('\n'),
      mergeStrategy: 'merge',
      summary: `Создать page-карточку «${id}»`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      7. Виджет в entity view                        */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "view.widget",
  title: "Виджет в entity view",
  description:
    "Добавляет виджет атрибута/действия/связи в существующую entity view",
  category: "view",
  command: "view.widget",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "viewId",
          label: "Entity view",
          type: "select",
          dynamicOptions: "entityViews",
          required: true,
        },
        {
          name: "widgetId",
          label: "ID виджета",
          type: "text",
          required: true,
          placeholder: "editors_deviceName",
        },
        {
          name: "widgetType",
          label: "Тип виджета",
          type: "select",
          defaultValue: "attribute",
          options: [
            { value: "attribute", label: "Атрибут" },
            { value: "action", label: "Действие" },
            { value: "linkage", label: "Связь" },
            { value: "history", label: "История" },
            { value: "comments", label: "Комментарии" },
            { value: "conversation", label: "Переписки" },
            { value: "runs_history", label: "История запусков" },
            { value: "calculation", label: "Расчёт" },
          ],
        },
        {
          name: "attribute",
          label: "Атрибут (для type: attribute)",
          type: "attribute-ref",
          help: "ID атрибута сущности",
        },
        {
          name: "action",
          label: "Действие (для type: action)",
          type: "text",
          placeholder: "actions_device_create",
        },
        {
          name: "linkage",
          label: "Связь (для type: linkage)",
          type: "select",
          dynamicOptions: "existingLinkages",
        },
        {
          name: "label",
          label: "Заголовок",
          type: "text",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.widgetId ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { widgetId: "Только латиница, цифры, _" };
        }
        if (!values.viewId) return { viewId: "Выберите entity view" };
        return null;
      },
    },
  ],

  generate: (values) => {
    const viewId = String(values.viewId ?? "").trim();
    const widgetId = String(values.widgetId ?? "").trim();
    const widgetType = String(values.widgetType ?? "attribute");
    const attribute = String(values.attribute ?? "").trim();
    const action = String(values.action ?? "").trim();
    const linkage = String(values.linkage ?? "").trim();
    const label = String(values.label ?? "").trim();

    const lines: string[] = [];
    lines.push("views:");
    lines.push(`  - id: ${viewId}`);
    lines.push(`    widgets:`);
    lines.push(`      - id: ${widgetId}`);
    lines.push(`        type: ${widgetType}`);

    if (widgetType === "attribute" && attribute) {
      lines.push(`        attribute: ${attribute}`);
    }
    if (widgetType === "action" && action) {
      lines.push(`        action: ${action}`);
    }
    if (widgetType === "linkage" && linkage) {
      lines.push(`        linkage: ${linkage}`);
    }
    if (label) {
      lines.push(`        label: "${label.replace(/"/g, '\\"')}"`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Виджет «${widgetId}» (${widgetType})`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      8. Группа в entity view                        */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: 'view.group',
  title: 'Группа в entity view',
  description: 'Добавляет блок/вкладку/форму в существующую entity view',
  category: 'view',
  command: 'view.group',

  steps: [
    {
      id: 'main',
      title: 'Параметры',
      fields: [
        {
          name: 'viewId',
          label: 'Entity view',
          type: 'select',
          dynamicOptions: 'entityViews',
          required: true,
        },
        {
          name: 'groupId',
          label: 'ID группы',
          type: 'text',
          required: true,
          placeholder: 'blocks_infoDevice',
        },
        {
          name: 'groupType',
          label: 'Тип группы',
          type: 'select',
          defaultValue: 'block',
          options: [
            { value: 'block', label: 'Блок' },
            { value: 'tab', label: 'Вкладка' },
            { value: 'form', label: 'Форма' },
            { value: 'tabs', label: 'Группа вкладок' },
          ],
        },
        {
          name: 'label',
          label: 'Заголовок',
          type: 'text',
        },
        {
          name: 'widgets',
          label: 'Виджеты (ID через запятую)',
          type: 'text',
          placeholder: 'editors_name, editors_ip',
          help: 'ID существующих виджетов этой view',
        },
        {
          name: 'blocks',
          label: 'Вложенные блоки (ID через запятую)',
          type: 'text',
          placeholder: 'blocks_info',
          help: 'Для типов tab и tabs',
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.groupId ?? '').trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { groupId: 'Только латиница, цифры, _' };
        }
        if (!values.viewId) return { viewId: 'Выберите entity view' };
        return null;
      },
    },
  ],

  generate: (values) => {
    const viewId = String(values.viewId ?? '').trim();
    const groupId = String(values.groupId ?? '').trim();
    const groupType = String(values.groupType ?? 'block');
    const label = String(values.label ?? '').trim();
    const widgetsRaw = String(values.widgets ?? '').trim();
    const blocksRaw = String(values.blocks ?? '').trim();

    const widgets = widgetsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const blocks = blocksRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const lines: string[] = [];
    lines.push('views:');
    lines.push(`  - id: ${viewId}`);
    lines.push(`    groups:`);
    lines.push(`      - id: ${groupId}`);
    lines.push(`        type: ${groupType}`);
    if (label) {
      lines.push(`        label: "${label.replace(/"/g, '\\"')}"`);
    }

    // layout только для block/form
    if (groupType === 'block' || groupType === 'form') {
      lines.push(`        layout:`);
      lines.push(`          direction: column`);
    }

    if (widgets.length > 0 || blocks.length > 0) {
      lines.push(`        components:`);
      for (const b of blocks) {
        lines.push(`          - block: ${b}`);
      }
      for (const w of widgets) {
        lines.push(`          - widget: ${w}`);
      }
    }

    return {
      yaml: lines.join('\n'),
      mergeStrategy: 'merge',
      summary: `Группа «${groupId}» (${groupType})`,
    };
  },
});