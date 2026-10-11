import {
  isMap,
  isSeq,
  isScalar,
  isPair,
  parseDocument,
  type Pair,
} from "yaml";

export type FormatMode = "soft" | "strict";

/* ------------------------------------------------------------------ */
/*                     Стандартный порядок ключей                      */
/* ------------------------------------------------------------------ */

const TOP_LEVEL_ORDER = [
  "id",
  "type",
  "version",
  "name",
  "description",
  "status",
  "date",
  "author",
  "tags",
  "entities",
  "linkages",
  "trees",
  "transitiveLinkages",
  "dataTypes",
  "sequences",
  "counterColorPattern",
  "mixins",
  "dataRules",
  "actions",
  "medias",
  "views",
  "menus",
  "uiRules",
  "uiPresets",
  "exchangeSettings",
  "permissions",
  "accessRules",
  "localizations",
];

const ENTITY_ORDER = [
  "id",
  "name",
  "description",
  "label",
  "kind",
  "inherits",
  "attributes",
  "sorting",
  "identification",
  "reconciliation",
  "projection",
  "searching",
  "icons",
  "graphView",
  "scanTarget",
  "scanTargetGroup",
];

const ATTRIBUTE_ORDER = [
  "id",
  "name",
  "description",
  "dataType",
  "entity",
  "item",
  "sequence",
  "template",
  "defaultPrefix",
  "incrementTemplate",
  "segment",
  "prefixRules",
  "constraints",
  "readonly",
  "comments",
  "calculation",
];

const LINKAGE_ORDER = [
  "id",
  "name",
  "description",
  "side1",
  "side2",
  "type",
  "undirected",
  "nameFrom",
  "useForSearch",
  "attributes",
  "sorting",
  "view",
  "excludeOnGraph",
];

const ACTION_ORDER = [
  "id",
  "name",
  "description",
  "type",
  "entity",
  "operation",
  "modal",
  "panel",
  "view",
  "automation",
  "scenario",
  "workerTag",
];

const VIEW_ORDER = [
  "id",
  "type",
  "label",
  "description",
  "entity",
  "source",
  "table",
  "widgets",
  "groups",
  "views",
  "actionPanel",
  "inherits",
];

const MENU_ORDER = [
  "id",
  "route",
  "label",
  "type",
  "placement",
  "priority",
  "icon",
  "description",
  "view",
  "items",
];

const DATA_RULE_ORDER = [
  "id",
  "name",
  "description",
  "target",
  "entity",
  "linkage",
  "attribute",
  "condition",
  "rule",
  "message",
  "help",
];

/* ------------------------------------------------------------------ */
/*                       Карта: путь → порядок                         */
/* ------------------------------------------------------------------ */

function getOrderForPath(path: (string | number)[]): string[] {
  const key = pathToKey(path);
  switch (key) {
    case "":
      return TOP_LEVEL_ORDER;
    case "entities[*]":
      return ENTITY_ORDER;
    case "entities[*].attributes[*]":
    case "linkages[*].attributes[*]":
      return ATTRIBUTE_ORDER;
    case "linkages[*]":
      return LINKAGE_ORDER;
    case "actions[*]":
      return ACTION_ORDER;
    case "views[*]":
      return VIEW_ORDER;
    case "menus[*]":
      return MENU_ORDER;
    case "dataRules[*]":
      return DATA_RULE_ORDER;
    default:
      return [];
  }
}

function pathToKey(path: (string | number)[]): string {
  let out = "";
  for (const seg of path) {
    if (typeof seg === "number") out += "[*]";
    else out += (out ? "." : "") + seg;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*                       Мягкое форматирование                         */
/* ------------------------------------------------------------------ */

/**
 * Просто вызывает doc.toString() — yaml сам нормализует отступы и пробелы.
 * Комментарии, порядок ключей и structure сохраняются.
 */
export function softFormat(yamlText: string): string {
  try {
    const doc = parseDocument(yamlText, {
      keepSourceTokens: true,
    });
    if (doc.errors.length > 0) return yamlText;
    return doc.toString({ lineWidth: 120 });
  } catch {
    return yamlText;
  }
}

/* ------------------------------------------------------------------ */
/*                       Строгое форматирование                        */
/* ------------------------------------------------------------------ */

/**
 * Форматирование + упорядочивание ключей внутри мап.
 * Работает с AST, не теряя комментарии.
 */
export function strictFormat(yamlText: string): string {
  try {
    const doc = parseDocument(yamlText, {
      keepSourceTokens: true,
    });
    if (doc.errors.length > 0) return yamlText;

    if (doc.contents) {
      reorderNode(doc.contents, []);
    }

    return doc.toString({ lineWidth: 120 });
  } catch {
    return yamlText;
  }
}

/* ------------------------------------------------------------------ */
/*                     Обход и переупорядочивание AST                  */
/* ------------------------------------------------------------------ */

function reorderNode(node: unknown, path: (string | number)[]): void {
  if (!node || typeof node !== "object") return;

  if (isMap(node)) {
    reorderMap(node as { items: unknown[] }, path);

    // рекурсивно обрабатываем значения в новом порядке
    for (const pair of (node as { items: Pair[] }).items) {
      if (!isPair(pair)) continue;
      const key = isScalar(pair.key) ? String(pair.key.value) : null;
      if (key === null) continue;
      reorderNode(pair.value, [...path, key]);
    }
    return;
  }

  if (isSeq(node)) {
    const items = (node as { items: unknown[] }).items;
    for (let i = 0; i < items.length; i++) {
      reorderNode(items[i], [...path, i]);
    }
  }
}

function reorderMap(
  map: { items: unknown[] },
  path: (string | number)[],
): void {
  const order = getOrderForPath(path);
  if (order.length === 0) return;

  const orderIndex = new Map<string, number>();
  order.forEach((key, idx) => orderIndex.set(key, idx));

  const items = map.items as Pair[];

  // стабильная сортировка: сначала ключи из order, потом остальные в исходном порядке
  const indexed = items.map((pair, originalIdx) => {
    const key =
      isPair(pair) && isScalar(pair.key) ? String(pair.key.value) : "";
    const orderPos = orderIndex.has(key)
      ? orderIndex.get(key)!
      : Number.MAX_SAFE_INTEGER;
    return { pair, originalIdx, orderPos };
  });

  indexed.sort((a, b) => {
    if (a.orderPos !== b.orderPos) return a.orderPos - b.orderPos;
    return a.originalIdx - b.originalIdx;
  });

  map.items = indexed.map((it) => it.pair);
}

/* ------------------------------------------------------------------ */
/*                       Публичная точка входа                         */
/* ------------------------------------------------------------------ */

export function formatYaml(
  yamlText: string,
  mode: FormatMode = "soft",
): string {
  return mode === "strict" ? strictFormat(yamlText) : softFormat(yamlText);
}

export function formatWillChange(
  yamlText: string,
  mode: FormatMode = "soft",
): boolean {
  return formatYaml(yamlText, mode) !== yamlText;
}

/* ------------------------------------------------------------------ */
/*                       Проверка на комментарии                       */
/* ------------------------------------------------------------------ */

/**
 * Возвращает true, если в тексте есть YAML-комментарии.
 * Используется для UI: показать пользователю, что комментарии сохранятся.
 */
export function hasComments(yamlText: string): boolean {
  // простой регексп — комментарий это "#" в начале строки или после пробела
  return /(^|\s)#/.test(yamlText);
}

// чтобы TS не жаловался
void hasComments;
void formatWillChange;
void isScalar;
void Node;
