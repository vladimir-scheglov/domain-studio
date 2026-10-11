import { collectReferences } from "./references";

export type CoverageSeverity = "info" | "warning";

export type CoverageIssue = {
  id: string;
  severity: CoverageSeverity;
  title: string;
  description: string;
  /** Путь для перехода к проблемному элементу (для навигации). */
  path: (string | number)[] | null;
  /** Категория — для группировки в UI. */
  category: "entity" | "view" | "action" | "linkage" | "menu" | "rule" | "misc";
};

export type CoverageReport = {
  issues: CoverageIssue[];
  stats: {
    entities: number;
    views: number;
    actions: number;
    menus: number;
    linkages: number;
    rules: number;
    /** Сколько сущностей имеет хотя бы одно представление. */
    entitiesWithViews: number;
    /** Сколько сущностей имеет хотя бы одно действие. */
    entitiesWithActions: number;
  };
};

/**
 * Анализирует схему и возвращает список проблем покрытия.
 */
export function buildCoverageReport(parsed: unknown): CoverageReport {
  const refs = collectReferences(parsed);
  const parsedObj =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};

  const issues: CoverageIssue[] = [];

  /* -------- Индексы -------- */

  // Сущности, к которым привязано представление:
  // - views[type=entity].entity
  // - views[type=list].source.entity
  const entitiesWithViews = new Set<string>();
  for (const v of (parsedObj.views as
    Array<Record<string, unknown>> | undefined) ?? []) {
    if (typeof v !== "object" || v === null) continue;
    const type = v.type;
    if (type === "entity" && typeof v.entity === "string") {
      entitiesWithViews.add(v.entity);
    } else if (type === "list") {
      const source = v.source as Record<string, unknown> | undefined;
      if (source && typeof source.entity === "string") {
        entitiesWithViews.add(source.entity);
      }
    }
  }

  // Сущности, к которым привязано действие:
  // - actions[*].entity
  const entitiesWithActions = new Set<string>();
  for (const a of (parsedObj.actions as
    Array<Record<string, unknown>> | undefined) ?? []) {
    if (typeof a !== "object" || a === null) continue;
    if (typeof a.entity === "string") entitiesWithActions.add(a.entity);
  }

  // Сущности, к которым привязан пункт меню:
  // - menus[].items[].view → views[].id → views[].source.entity
  const viewToEntity = new Map<string, string>();
  for (const v of (parsedObj.views as
    Array<Record<string, unknown>> | undefined) ?? []) {
    if (typeof v !== "object" || v === null) continue;
    const id = typeof v.id === "string" ? v.id : null;
    if (!id) continue;
    if (v.type === "list") {
      const source = v.source as Record<string, unknown> | undefined;
      if (source && typeof source.entity === "string") {
        viewToEntity.set(id, source.entity);
      }
    }
  }

  const viewsInMenus = new Set<string>();
  for (const m of (parsedObj.menus as
    Array<Record<string, unknown>> | undefined) ?? []) {
    if (typeof m !== "object" || m === null) continue;
    const items = m.items as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      if (typeof item.view === "string") viewsInMenus.add(item.view);
    }
  }

  /* -------- 1. Сущности без представлений -------- */

  for (const ent of refs.entities) {
    if (!entitiesWithViews.has(ent.id)) {
      issues.push({
        id: `entity-no-view:${ent.id}`,
        severity: "warning",
        title: `Сущность «${ent.name ?? ent.id}» без представления`,
        description:
          "Ни одна вкладка списка или карточка не привязана к этой сущности",
        path: ["entities", ent.id],
        category: "entity",
      });
    }
  }

  /* -------- 2. Сущности без действий -------- */

  for (const ent of refs.entities) {
    if (!entitiesWithActions.has(ent.id)) {
      issues.push({
        id: `entity-no-action:${ent.id}`,
        severity: "info",
        title: `Сущность «${ent.name ?? ent.id}» без действий`,
        description:
          "Нет действий создания, редактирования или удаления для этой сущности",
        path: ["entities", ent.id],
        category: "action",
      });
    }
  }

  /* -------- 3. Списки без пункта меню -------- */

  for (const v of (parsedObj.views as
    Array<Record<string, unknown>> | undefined) ?? []) {
    if (typeof v !== "object" || v === null) continue;
    if (v.type !== "list") continue;
    const id = typeof v.id === "string" ? v.id : null;
    if (!id) continue;
    if (!viewsInMenus.has(id)) {
      issues.push({
        id: `view-no-menu:${id}`,
        severity: "info",
        title: `Список «${id}» не привязан к меню`,
        description: "Пользователь не сможет открыть этот список из навигации",
        path: ["views", id],
        category: "view",
      });
    }
  }

  /* -------- 4. Связи с внешними сущностями без указания домена -------- */

  for (const l of refs.linkages) {
    const s1 = l.side1;
    const s2 = l.side2;
    const known = new Set(refs.entities.map((e) => e.id));
    if (s1 && !known.has(s1) && !s1.includes("/")) {
      issues.push({
        id: `linkage-broken:${l.id}:side1`,
        severity: "warning",
        title: `Связь «${l.name ?? l.id}»: неизвестная side1 «${s1}»`,
        description:
          "Укажите FQID (example.com/Entity) для ссылки на другой домен",
        path: ["linkages", l.id, "side1"],
        category: "linkage",
      });
    }
    if (s2 && !known.has(s2) && !s2.includes("/")) {
      issues.push({
        id: `linkage-broken:${l.id}:side2`,
        severity: "warning",
        title: `Связь «${l.name ?? l.id}»: неизвестная side2 «${s2}»`,
        description:
          "Укажите FQID (example.com/Entity) для ссылки на другой домен",
        path: ["linkages", l.id, "side2"],
        category: "linkage",
      });
    }
  }

  /* -------- 5. Правила данных для удалённых сущностей -------- */

  for (const r of (parsedObj.dataRules as
    Array<Record<string, unknown>> | undefined) ?? []) {
    if (typeof r !== "object" || r === null) continue;
    const entity = r.entity;
    if (typeof entity === "string" && entity && !entity.includes("/")) {
      const known = new Set(refs.entities.map((e) => e.id));
      if (!known.has(entity)) {
        issues.push({
          id: `rule-broken:${r.id ?? "?"}:entity`,
          severity: "warning",
          title: `Правило «${r.name ?? r.id}» ссылается на удалённую сущность «${entity}»`,
          description: "Правило не будет применяться",
          path: ["dataRules", String(r.id ?? "")],
          category: "rule",
        });
      }
    }
  }

  /* -------- Статистика -------- */

  const stats = {
    entities: refs.entities.length,
    views: refs.views.length,
    actions: refs.actions.length,
    menus: Array.isArray(parsedObj.menus) ? parsedObj.menus.length : 0,
    linkages: refs.linkages.length,
    rules: Array.isArray(parsedObj.dataRules) ? parsedObj.dataRules.length : 0,
    entitiesWithViews: entitiesWithViews.size,
    entitiesWithActions: entitiesWithActions.size,
  };

  return { issues, stats };
}
