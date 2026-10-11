import { collectReferences } from "./references";

export type CollisionEntry = {
  /** Путь в документе, где уже есть элемент с этим id. */
  path: (string | number)[];
  /** Тип конфликта. */
  kind: "entity" | "linkage" | "view" | "action" | "dataType" | "menu" | "rule";
  /** Id, который конфликтует. */
  id: string;
};

/**
 * Анализирует YAML-фрагмент и текущий документ,
 * находит id, которые совпадают.
 */
export function findCollisions(
  currentParsed: unknown,
  fragmentParsed: unknown,
): CollisionEntry[] {
  if (!currentParsed || !fragmentParsed) return [];

  const current = collectReferences(currentParsed);
  const fragment = collectReferences(fragmentParsed);

  const collisions: CollisionEntry[] = [];

  const currentEntities = new Set(current.entities.map((e) => e.id));
  const currentLinkages = new Set(current.linkages.map((l) => l.id));
  const currentViews = new Set(current.views.map((v) => v.id));
  const currentActions = new Set(current.actions.map((a) => a.id));
  const currentDataTypes = new Set(current.dataTypes.map((d) => d.id));

  for (const e of fragment.entities) {
    if (currentEntities.has(e.id)) {
      collisions.push({ path: ["entities", e.id], kind: "entity", id: e.id });
    }
  }

  for (const l of fragment.linkages) {
    if (currentLinkages.has(l.id)) {
      collisions.push({ path: ["linkages", l.id], kind: "linkage", id: l.id });
    }
  }

  for (const v of fragment.views) {
    if (currentViews.has(v.id)) {
      collisions.push({ path: ["views", v.id], kind: "view", id: v.id });
    }
  }

  for (const a of fragment.actions) {
    if (currentActions.has(a.id)) {
      collisions.push({ path: ["actions", a.id], kind: "action", id: a.id });
    }
  }

  for (const d of fragment.dataTypes) {
    if (currentDataTypes.has(d.id)) {
      collisions.push({
        path: ["dataTypes", d.id],
        kind: "dataType",
        id: d.id,
      });
    }
  }

  return collisions;
}

export function formatKind(kind: CollisionEntry["kind"]): string {
  switch (kind) {
    case "entity":
      return "сущность";
    case "linkage":
      return "связь";
    case "view":
      return "представление";
    case "action":
      return "действие";
    case "dataType":
      return "тип данных";
    case "menu":
      return "меню";
    case "rule":
      return "правило";
    default:
      return kind;
  }
}
