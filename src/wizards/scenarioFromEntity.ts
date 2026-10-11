import { wizardRegistry } from "@/services/wizardRegistry";
import { useDocumentStore } from "@/store/documentStore";

/* ------------------------------------------------------------------ */
/*                          Утилиты                                    */
/* ------------------------------------------------------------------ */

type Entity = {
  id: string;
  name?: string;
  label?: string;
  attributes?: Array<{ id: string; name?: string; dataType?: string }>;
};

function readEntity(parsed: unknown, entityId: string): Entity | null {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).entities)
  ) {
    return null;
  }
  const entities = (parsed as { entities: Entity[] }).entities;
  return entities.find((e) => e.id === entityId) ?? null;
}

/**
 * Идентификатор сущности в snake_case для префикса id.
 * Например: DeviceConfiguration → device_configuration
 */
function toSnakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Возвращает подходящий атрибут для label — строку, которая
 * идентифицирует объект в списках.
 */
function pickLabelAttribute(entity: Entity): string | null {
  const attrs = entity.attributes ?? [];
  const preferred = ["name", "title", "subject", "label"];
  for (const p of preferred) {
    if (attrs.some((a) => a.id === p)) return p;
  }
  const firstString = attrs.find((a) => a.dataType === "String");
  if (firstString) return firstString.id;
  return attrs[0]?.id ?? null;
}

/**
 * Первые N атрибутов, которые имеет смысл показать в списке.
 */
function pickListColumns(
  entity: Entity,
  max = 5,
): Array<{ id: string; name: string }> {
  const attrs = entity.attributes ?? [];
  const filtered = attrs.filter((a) => {
    const dt = a.dataType ?? "";
    return dt !== "Text" && dt !== "Attachment" && dt !== "Table";
  });
  return filtered.slice(0, max).map((a) => ({
    id: a.id,
    name: a.name ?? a.id,
  }));
}

/* ------------------------------------------------------------------ */
/*                          Генерация                                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*                          Генерация                                  */
/* ------------------------------------------------------------------ */

type GenOptions = {
  entity: Entity;
  entityId: string;
  prefix: string;
  labelAttr: string | null;
  columns: Array<{ id: string; name: string }>;
  withList: boolean;
  withPanel: boolean;
  withModal: boolean;
  withActions: boolean;
  withMenu: boolean;
  withBulkRemove: boolean;
};

function generateYaml(opts: GenOptions): string {
  const { withList, withPanel, withModal, withActions, withMenu } = opts;

  const parts: string[] = [];

  // 1) actions — на верхнем уровне
  if (withActions) {
    parts.push(buildActions(opts));
  }

  // 2) views — все внутри одного ключа
  const viewEntries: string[] = [];

  if (withPanel || withModal) {
    viewEntries.push(buildEntityViewEntry(opts));
  }
  if (withList) {
    viewEntries.push(buildListViewEntry(opts));
  }
  if (viewEntries.length > 0) {
    parts.push(["views:", ...viewEntries].join("\n"));
  }

  // 3) menu
  if (withMenu && withList) {
    parts.push(buildMenu(opts));
  }

  return parts.join("\n");
}

/* ------------------------------------------------------------------ */
/*                    Views — запись сущности                          */
/* ------------------------------------------------------------------ */

/**
 * Одна entity view со всем содержимым: widgets + groups + inner views.
 * Всё внутри views[*].
 */
function buildEntityViewEntry(opts: GenOptions): string {
  const {
    entity,
    entityId,
    prefix,
    withPanel,
    withModal,
    withBulkRemove,
    withActions,
  } = opts;

  const lines: string[] = [];

  // Заголовок view
  lines.push(`  - id: view${entityId}`);
  lines.push(`    type: entity`);
  lines.push(`    entity: ${entityId}`);

  // ---- WIDGETS ----
  const widgets: string[] = [];

  // Виджеты атрибутов
  for (const attr of entity.attributes ?? []) {
    const widgetId = `editors_${attr.id}`;
    widgets.push(`      - id: ${widgetId}`);
    widgets.push(`        type: attribute`);
    widgets.push(`        attribute: ${attr.id}`);
    const desc = String(attr.name ?? attr.id).replace(/"/g, "'");
    widgets.push(`        description: "${desc}"`);
  }

  // Кнопки
  if (withActions) {
    widgets.push(`      - id: buttons_create${entityId}`);
    widgets.push(`        type: action`);
    widgets.push(`        action: actions_${prefix}_create`);
    widgets.push(`        description: Создать`);
    widgets.push(`        control:`);
    widgets.push(`          type: regular_button`);
    widgets.push(`          label: Добавить`);

    if (withBulkRemove) {
      widgets.push(`      - id: buttons_remove${entityId}`);
      widgets.push(`        type: action`);
      widgets.push(`        action: actions_${prefix}_bulkRemove`);
      widgets.push(`        description: Удалить выбранные`);
      widgets.push(`        control:`);
      widgets.push(`          type: regular_button`);
      widgets.push(`          label: Удалить`);
    }
  }

  lines.push(`    widgets:`);
  lines.push(...widgets);

  // ---- GROUPS ----
  const groups: string[] = [];

  // Блок информации
  groups.push(`      - id: blocks_info${entityId}`);
  groups.push(`        type: block`);
  groups.push(`        description: Информация`);
  groups.push(`        layout:`);
  groups.push(`          direction: column`);
  groups.push(`        components:`);
  for (const attr of entity.attributes ?? []) {
    groups.push(`          - widget: editors_${attr.id}`);
  }

  // Вкладка
  groups.push(`      - id: tabs_info${entityId}`);
  groups.push(`        type: tab`);
  groups.push(`        label: Детали`);
  groups.push(`        components:`);
  groups.push(`          - block: blocks_info${entityId}`);

  // Форма создания (если есть модальное окно)
  if (withModal) {
    groups.push(`      - id: blocks_forms_new${entityId}`);
    groups.push(`        type: form`);
    groups.push(`        layout:`);
    groups.push(`          direction: column`);
    groups.push(`        components:`);
    for (const attr of entity.attributes ?? []) {
      const dt = attr.dataType ?? "";
      if (dt !== "Attachment" && dt !== "Counter" && dt !== "Identifier") {
        groups.push(`          - widget: editors_${attr.id}`);
      }
    }
  }

  lines.push(`    groups:`);
  lines.push(...groups);

  // ---- INNER VIEWS (panel + modal) ----
  const innerViews: string[] = [];
  if (withPanel) {
    innerViews.push(`      - id: panels_info${entityId}`);
    innerViews.push(`        type: panel`);
    innerViews.push(`        label: "${entity.name ?? entityId}"`);
    innerViews.push(`        tabs:`);
    innerViews.push(`          - tab: tabs_info${entityId}`);
  }
  if (withModal) {
    innerViews.push(`      - id: forms_new${entityId}`);
    innerViews.push(`        type: modal`);
    innerViews.push(`        form: blocks_forms_new${entityId}`);
    innerViews.push(`        label: "Добавить ${entity.name ?? entityId}"`);
  }

  if (innerViews.length > 0) {
    lines.push(`    views:`);
    lines.push(...innerViews);
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*                    Views — списочное представление                  */
/* ------------------------------------------------------------------ */

function buildListViewEntry(opts: GenOptions): string {
  const { entityId, prefix, columns, withBulkRemove, withActions } = opts;

  const lines: string[] = [];
  lines.push(`  - id: lists_${prefix}`);
  lines.push(`    type: list`);
  lines.push(`    label: Список`);
  lines.push(`    source:`);
  lines.push(`      type: operational`);
  lines.push(`      entity: ${entityId}`);
  lines.push(`    table:`);
  lines.push(`      columns:`);
  for (const col of columns) {
    const label = col.name.replace(/"/g, "'");
    lines.push(`        - id: ${col.id}`);
    lines.push(`          attribute: ${col.id}`);
    lines.push(`          label: "${label}"`);
  }
  lines.push(`      selection: ${withBulkRemove ? "true" : "false"}`);

  // actionPanel — ссылки на виджеты, определённые в viewDevice
  if (withActions) {
    lines.push(`    actionPanel:`);
    lines.push(`      - widget: buttons_create${entityId}`);
    if (withBulkRemove) {
      lines.push(`      - widget: buttons_remove${entityId}`);
    }
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*                          Actions                                    */
/* ------------------------------------------------------------------ */

function buildActions(opts: GenOptions): string {
  const { entityId, prefix, withPanel, withModal, withBulkRemove } = opts;
  const lines: string[] = ['actions:'];

  if (withModal) {
    lines.push(`  - id: actions_${prefix}_create`);
    lines.push(`    name: Добавить`);
    lines.push(`    type: open_modal`);
    lines.push(`    modal: forms_new${entityId}`);
    lines.push(`    entity: ${entityId}`);
    lines.push(`    operation: create`);
  }

  if (withPanel) {
    lines.push(`  - id: actions_${prefix}_openPanel`);
    lines.push(`    name: Детали`);
    lines.push(`    type: open_panel`);
    lines.push(`    panel: panels_info${entityId}`);
    lines.push(`    entity: ${entityId}`);
  }

  if (withBulkRemove) {
    lines.push(`  - id: actions_${prefix}_bulkRemove`);
    lines.push(`    name: Удалить`);
    lines.push(`    type: bulk`);
    lines.push(`    operation: remove`);
    lines.push(`    entity: ${entityId}`);
  }

  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*                          Menu                                       */
/* ------------------------------------------------------------------ */

function buildMenu(opts: GenOptions): string {
  const { entityId, prefix } = opts;
  const entityName = opts.entity.name ?? entityId;

  const lines: string[] = ['menus:'];
  lines.push(`  - id: menus_${prefix}`);
  lines.push(`    route: /${prefix}`);
  lines.push(`    label: "${entityName}"`);
  lines.push(`    type: root_group`);
  lines.push(`    placement: top`);
  lines.push(`    items:`);
  lines.push(`      - id: menu_${prefix}_list`);
  lines.push(`        route: /${prefix}/all`);
  lines.push(`        label: "Все"`);
  lines.push(`        type: menu`);
  lines.push(`        view: lists_${prefix}`);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*                            Регистрация                              */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "scenario.fromEntity",
  title: "Генерация CRUD из сущности",
  description:
    "Создаёт полный набор: список, панель, модальное окно, действия, меню",
  category: "scenario",
  command: "scenario.fromEntity",

  steps: [
    {
      id: "source",
      title: "Сущность",
      fields: [
        {
          name: "entityId",
          label: "Сущность",
          type: "entity-ref",
          required: true,
          help: "Из какой сущности генерировать",
        },
        {
          name: "prefix",
          label: "Префикс id",
          type: "text",
          required: true,
          placeholder: "devices",
          help: "Используется в id: lists_<prefix>, actions_<prefix>_create",
        },
        {
          name: "columns",
          label: "Колонки списка",
          type: "multiselect",
          dynamicOptions: "entityAttributes",
          help: "Выберите атрибуты, которые будут показаны в списке",
        },
        {
          name: "withList",
          label: "Списочное представление",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withPanel",
          label: "Компактное представление (панель)",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withModal",
          label: "Модальное окно создания",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withActions",
          label: "Действия (создание, просмотр, удаление)",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withBulkRemove",
          label: "Массовое удаление",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "withMenu",
          label: "Пункт меню",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values): Record<string, string> | null => {
        if (!values.entityId) return { entityId: "Укажите сущность" };
        const prefix = String(values.prefix ?? "").trim();
        if (!/^[a-z][a-z0-9_]*$/.test(prefix)) {
          return {
            prefix: "Только строчная латиница, цифры, _; начинается с буквы",
          };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const entityId = String(values.entityId ?? "").trim();
    const prefix = String(values.prefix ?? "").trim() || toSnakeCase(entityId);

    const parsed = useDocumentStore.getState().parsed;
    const entity = readEntity(parsed, entityId);

    if (!entity) {
      return {
        yaml: `# Сущность «${entityId}» не найдена`,
        mergeStrategy: "merge",
        summary: "Ошибка: сущность не найдена",
      };
    }

    const labelAttr = pickLabelAttribute(entity);
    // если пользователь явно выбрал колонки — берём их
    const explicitColumns = Array.isArray(values.columns)
      ? (values.columns as string[])
      : [];

    const columns =
      explicitColumns.length > 0
        ? explicitColumns.map((id) => {
            const attr = (entity.attributes ?? []).find((a) => a.id === id);
            return { id, name: attr?.name ?? id };
          })
        : pickListColumns(entity);

    const yaml = generateYaml({
      entity,
      entityId,
      prefix,
      labelAttr,
      columns,
      withList: Boolean(values.withList),
      withPanel: Boolean(values.withPanel),
      withModal: Boolean(values.withModal),
      withActions: Boolean(values.withActions),
      withBulkRemove: Boolean(values.withBulkRemove),
      withMenu: Boolean(values.withMenu),
    });

    return {
      yaml,
      mergeStrategy: "merge",
      summary: `Сгенерировать CRUD для «${entity.name ?? entityId}»`,
    };
  },
});
