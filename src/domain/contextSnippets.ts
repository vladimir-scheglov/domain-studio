import type { CursorPath } from "@/store/selectionStore";
import { getNodeAtPath } from "./pathUtils";

export type SnippetContext = {
  parsed: unknown;
  cursorPath: CursorPath;
};

export type GeneratedSnippet = {
  yaml: string;
  /** Путь для скролла после вставки. */
  focusPath?: (string | number)[];
};

export type ContextSnippet = {
  id: string;
  label: string;
  description: string;
  targetPath: (string | number)[];
  mergeStrategy: "merge" | "replace";
  generate: (ctx: SnippetContext) => GeneratedSnippet | null;
};

/* ------------------------------------------------------------------ */
/*                       Публичная функция                             */
/* ------------------------------------------------------------------ */

export function getContextSnippets(
  cursorPath: CursorPath,
  parsed: unknown,
): ContextSnippet[] {
  if (cursorPath.length === 0) return topLevelSnippets();

  const [root, , third] = cursorPath;

  if (root === "entities") {
    const entityId = typeof cursorPath[1] === "string" ? cursorPath[1] : null;
    if (!entityId) return [];

    if (third === "attributes") return attributeSnippets(entityId, parsed);
    return entitySnippets(entityId, parsed);
  }

  if (root === "views") {
    const viewId = typeof cursorPath[1] === "string" ? cursorPath[1] : null;
    if (!viewId) return [];
    return viewSnippets(viewId);
  }

  return [];
}

/* ------------------------------------------------------------------ */
/*                       Утилиты                                       */
/* ------------------------------------------------------------------ */

type EntityLike = {
  id: string;
  attributes?: Array<{ id?: string }>;
  sorting?: Array<{ id?: string }>;
  searching?: unknown;
  projection?: unknown;
};

function readEntities(parsed: unknown): EntityLike[] {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).entities)
  ) {
    return [];
  }
  return (parsed as { entities: EntityLike[] }).entities;
}

function getEntity(parsed: unknown, entityId: string): EntityLike | null {
  return readEntities(parsed).find((e) => e.id === entityId) ?? null;
}

/**
 * Уникальный id в рамках существующих id.
 * Если name занят — генерирует name2, name3 и т.д.
 */
function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

/**
 * Имя первого строкового атрибута, пригодного для сортировки.
 * Иначе — 'id'.
 */
function pickSortableAttribute(entity: EntityLike): string {
  const attrs = entity.attributes ?? [];
  // ищем name, потом любой
  const has = (n: string) => attrs.some((a) => a.id === n);
  if (has("name")) return "name";
  if (attrs.length > 0 && attrs[0].id) return attrs[0].id;
  return "id";
}

/* ------------------------------------------------------------------ */
/*                       Верхний уровень                               */
/* ------------------------------------------------------------------ */

function topLevelSnippets(): ContextSnippet[] {
  return [
    {
      id: "add.metadata",
      label: "Метаданные домена",
      description: "Минимальная шапка схемы",
      targetPath: [],
      mergeStrategy: "merge",
      generate: () => ({
        yaml: [
          "id: example.domain.tld",
          "type: domain",
          "version: 0.0.1",
          "name: New Domain",
          "tags: []",
        ].join("\n"),
        focusPath: ["id"],
      }),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*                       Сниппеты сущности                             */
/* ------------------------------------------------------------------ */

function entitySnippets(entityId: string, parsed: unknown): ContextSnippet[] {
  const entity = getEntity(parsed, entityId);
  if (!entity) return [];

  const eid = entityId.toLowerCase();
  const sortableAttr = pickSortableAttribute(entity);

  const existingSortingIds = new Set(
    (entity.sorting ?? []).map((s) => s.id ?? "").filter(Boolean),
  );
  const existingSortingAttr = new Set(
    (entity.sorting ?? []).map(
      (s) => (s as { attribute?: string }).attribute ?? "",
    ),
  );

  const hasSearching =
    entity.searching !== undefined && entity.searching !== null;
  const hasProjection =
    entity.projection !== undefined && entity.projection !== null;

  return [
    {
      id: "entity.add.attributes",
      label: "attributes",
      description:
        (entity.attributes ?? []).length > 0
          ? "Секция уже есть"
          : "Добавить секцию attributes",
      targetPath: ["entities", entityId],
      mergeStrategy: "merge",
      generate: () => {
        if ((entity.attributes ?? []).length > 0) return null;
        return {
          yaml: "attributes: []",
          focusPath: ["entities", entityId, "attributes"],
        };
      },
    },
    {
      id: "entity.add.sorting",
      label: "sorting",
      description: `Правило сортировки по ${sortableAttr}`,
      targetPath: ["entities", entityId],
      mergeStrategy: "merge",
      generate: () => {
        if (!sortableAttr) return null;
        if (existingSortingAttr.has(sortableAttr)) return null;

        const candidateId = `by${capitalize(sortableAttr)}`;
        if (existingSortingIds.has(candidateId)) return null; // уже есть byName

        const id = candidateId; // больше не используем uniqueId для sorting
        return {
          yaml: [
            "sorting:",
            `  - id: ${id}`,
            `    name: По ${sortableAttr}`,
            "    by:",
            `      - attribute: ${sortableAttr}`,
            "        direction: asc",
          ].join("\n"),
          focusPath: ["entities", entityId, "sorting", id],
        };
      },
    },
    {
      id: "entity.add.searching",
      label: "searching",
      description: hasSearching ? "Уже настроено" : `Поиск по ${sortableAttr}`,
      targetPath: ["entities", entityId],
      mergeStrategy: "merge",
      generate: () => {
        if (hasSearching) return null;
        return {
          yaml: `searching: ${sortableAttr}`,
          focusPath: ["entities", entityId, "searching"],
        };
      },
    },
    {
      id: "entity.add.projection",
      label: "projection",
      description: hasProjection
        ? "Уже настроено"
        : `Проекция на ${sortableAttr}`,
      targetPath: ["entities", entityId],
      mergeStrategy: "merge",
      generate: () => {
        if (hasProjection) return null;
        return {
          yaml: `projection: ${sortableAttr}`,
          focusPath: ["entities", entityId, "projection"],
        };
      },
    },
    {
      id: "entity.add.crud",
      label: "CRUD-действия",
      description: "Действия создания, просмотра и удаления",
      targetPath: [],
      mergeStrategy: "merge",
      generate: () => ({
        yaml: [
          "actions:",
          `  - id: actions_${eid}_create`,
          "    name: Добавить",
          "    type: open_modal",
          `    modal: forms_new${capitalize(eid)}`,
          `    entity: ${entityId}`,
          "    operation: create",
          `  - id: actions_${eid}_openPanel`,
          "    name: Детали",
          "    type: open_panel",
          `    panel: panels_info${capitalize(eid)}`,
          `    entity: ${entityId}`,
          `  - id: actions_${eid}_bulkRemove`,
          "    name: Удалить",
          "    type: bulk",
          "    operation: remove",
          `    entity: ${entityId}`,
        ].join("\n"),
        focusPath: ["actions", `actions_${eid}_create`],
      }),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*                       Сниппеты атрибутов                            */
/* ------------------------------------------------------------------ */

function attributeSnippets(
  entityId: string,
  parsed: unknown,
): ContextSnippet[] {
  const entity = getEntity(parsed, entityId);
  if (!entity) return [];

  const existing = new Set(
    (entity.attributes ?? [])
      .map((a) => a.id)
      .filter((id): id is string => typeof id === "string"),
  );

  const make = (
    baseId: string,
    name: string,
    dataType: string,
    extras?: (id: string) => string[],
  ): ContextSnippet => ({
    id: `attr.${dataType.toLowerCase()}`,
    label: `+ ${dataType}`,
    description: name,
    targetPath: ["entities", entityId, "attributes"],
    mergeStrategy: "merge",
    generate: () => {
      const id = uniqueId(baseId, existing);
      const lines = [
        `- id: ${id}`,
        `  name: ${name}`,
        `  dataType: ${dataType}`,
      ];
      if (extras) lines.push(...extras(id));
      return {
        yaml: lines.join("\n"),
        focusPath: ["entities", entityId, "attributes", id],
      };
    },
  });

  return [
    make("newStringAttr", "Новая строка", "String"),
    make("newTextAttr", "Новый текст", "Text"),
    make("newIntegerAttr", "Новое число", "Integer"),
    make("newBoolAttr", "Новый флаг", "Bool"),
    make("newDateAttr", "Новая дата", "Date"),
    make("newTimestampAttr", "Новая метка", "Timestamp"),
    make("newIpAttr", "Новый IP", "IpAddress"),
    make("newReferenceAttr", "Новая ссылка", "Reference", () => [
      "  entity: OtherEntity",
    ]),
    make("newArrayAttr", "Новый массив", "Array", () => [
      "  item:",
      "    dataType: String",
    ]),
    make("newUrlAttr", "Новая ссылка URL", "Url"),
  ];
}

/* ------------------------------------------------------------------ */
/*                       Сниппеты представлений                        */
/* ------------------------------------------------------------------ */

function viewSnippets(viewId: string): ContextSnippet[] {
  return [
    {
      id: "view.add.column",
      label: "+ Колонка",
      description: "Колонка таблицы списка",
      targetPath: ["views", viewId, "table", "columns"],
      mergeStrategy: "merge",
      generate: () => ({
        yaml: [
          "- id: newColumn",
          "  attribute: name",
          "  label: Новый столбец",
        ].join("\n"),
        focusPath: ["views", viewId, "table", "columns", "newColumn"],
      }),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*                       Утилиты                                       */
/* ------------------------------------------------------------------ */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// экспорт для совместимости с существующим кодом палитры
export { getNodeAtPath };
