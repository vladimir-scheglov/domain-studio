import { useDocumentStore } from "@/store/documentStore";
import { collectReferences } from "./references";

export type OutlineItem = {
  id: string;
  label: string;
  /** Краткая подпись под id — например, тип связи, число атрибутов. */
  hint?: string;
};

export type OutlineGroup = {
  id: string;
  title: string;
  iconKind:
    "entity" | "linkage" | "view" | "action" | "dataType" | "menu" | "rule";
  items: OutlineItem[];
};

/**
 * Строит дерево Outline из parsed документа.
 * Пропускает пустые группы.
 */
export function buildOutline(parsed: unknown): OutlineGroup[] {
  const refs = collectReferences(parsed);
  const parsedObj =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};

  const groups: OutlineGroup[] = [];

  /* ------- Сущности ------- */
  if (refs.entities.length > 0) {
    groups.push({
      id: "entities",
      title: "Сущности",
      iconKind: "entity",
      items: refs.entities.map((e) => {
        const attrCount = refs.attributes.filter(
          (a) => a.entityId === e.id,
        ).length;
        return {
          id: e.id,
          label: e.name ?? e.id,
          hint: attrCount > 0 ? `${attrCount} атр.` : "—",
        };
      }),
    });
  }

  /* ------- Связи ------- */
  if (refs.linkages.length > 0) {
    groups.push({
      id: "linkages",
      title: "Связи",
      iconKind: "linkage",
      items: refs.linkages.map((l) => ({
        id: l.id,
        label: l.name ?? l.id,
        hint: l.type ?? "—",
      })),
    });
  }

  /* ------- Представления ------- */
  if (refs.views.length > 0) {
    groups.push({
      id: "views",
      title: "Представления",
      iconKind: "view",
      items: refs.views.map((v) => ({
        id: v.id,
        label: v.label ?? v.id,
        hint: v.type ?? "—",
      })),
    });
  }

  /* ------- Действия ------- */
  if (refs.actions.length > 0) {
    groups.push({
      id: "actions",
      title: "Действия",
      iconKind: "action",
      items: refs.actions.map((a) => ({
        id: a.id,
        label: a.id,
        hint: a.type ?? "—",
      })),
    });
  }

  /* ------- Пользовательские типы ------- */
  if (refs.dataTypes.length > 0) {
    groups.push({
      id: "dataTypes",
      title: "Типы данных",
      iconKind: "dataType",
      items: refs.dataTypes.map((d) => ({
        id: d.id,
        label: d.name ?? d.id,
        hint: d.dataType ?? "—",
      })),
    });
  }

  /* ------- Меню ------- */
  const menus = parsedObj.menus;
  if (Array.isArray(menus) && menus.length > 0) {
    groups.push({
      id: "menus",
      title: "Меню",
      iconKind: "menu",
      items: menus
        .map((m): OutlineItem | null => {
          if (typeof m !== "object" || m === null) return null;
          const mm = m as Record<string, unknown>;
          const id = typeof mm.id === "string" ? mm.id : null;
          if (!id) return null;
          return {
            id,
            label: typeof mm.label === "string" ? mm.label : id,
            hint: typeof mm.route === "string" ? mm.route : undefined,
          };
        })
        .filter((x): x is OutlineItem => x !== null),
    });
  }

  /* ------- Правила данных ------- */
  const rules = parsedObj.dataRules;
  if (Array.isArray(rules) && rules.length > 0) {
    groups.push({
      id: "dataRules",
      title: "Правила данных",
      iconKind: "rule",
      items: rules
        .map((r): OutlineItem | null => {
          if (typeof r !== "object" || r === null) return null;
          const rr = r as Record<string, unknown>;
          const id = typeof rr.id === "string" ? rr.id : null;
          if (!id) return null;
          const rule = rr.rule as Record<string, unknown> | undefined;
          const effect =
            rule && typeof rule.effect === "string" ? rule.effect : "—";
          return {
            id,
            label: typeof rr.name === "string" ? rr.name : id,
            hint: effect,
          };
        })
        .filter((x): x is OutlineItem => x !== null),
    });
  }

  return groups;
}

/* ------------------------------------------------------------------ */
/*                       Хук доступа                                   */
/* ------------------------------------------------------------------ */

export function useOutlineGroups(): OutlineGroup[] {
  const parsed = useDocumentStore((s) => s.parsed);
  return buildOutline(parsed);
}
