import { parse as parseFragment } from "yaml";
import { parseYaml, stringifyYaml } from "@/services/yamlService";

export type MutationResult = {
  yaml: string;
  parsed: unknown;
  doc: ReturnType<typeof parseYaml>["doc"];
};

/* ------------------------------------------------------------------ */
/*                       Удаление сущности                             */
/* ------------------------------------------------------------------ */

/**
 * Удаляет сущность по id.
 * Все связи, где эта сущность участвует (side1 или side2), также удаляются.
 */
export function deleteEntity(
  currentYaml: string,
  entityId: string,
): MutationResult {
  const current =
    (parseYaml(currentYaml).parsed as Record<string, unknown>) ?? {};

  const entities = readArr(current, "entities").filter(
    (e) => !(isObject(e) && e.id === entityId),
  );

  const linkages = readArr(current, "linkages").filter((l) => {
    if (!isObject(l)) return true;
    return l.side1 !== entityId && l.side2 !== entityId;
  });

  return rebuild(current, { entities, linkages });
}

/* ------------------------------------------------------------------ */
/*                       Удаление связи                                */
/* ------------------------------------------------------------------ */

export function deleteLinkage(
  currentYaml: string,
  linkageId: string,
): MutationResult {
  const current =
    (parseYaml(currentYaml).parsed as Record<string, unknown>) ?? {};

  const linkages = readArr(current, "linkages").filter(
    (l) => !(isObject(l) && l.id === linkageId),
  );

  return rebuild(current, { linkages });
}

/* ------------------------------------------------------------------ */
/*                       Массовое удаление                             */
/* ------------------------------------------------------------------ */

export function deleteMany(
  currentYaml: string,
  ids: { entities?: string[]; linkages?: string[] },
): MutationResult {
  const current =
    (parseYaml(currentYaml).parsed as Record<string, unknown>) ?? {};

  const removeEntities = new Set(ids.entities ?? []);
  const removeLinkages = new Set(ids.linkages ?? []);

  const entities = readArr(current, "entities").filter(
    (e) => !(isObject(e) && removeEntities.has(String(e.id))),
  );

  const linkages = readArr(current, "linkages").filter((l) => {
    if (!isObject(l)) return true;
    const id = String(l.id);
    if (removeLinkages.has(id)) return false;
    // связи, ссылающиеся на удалённые сущности — тоже убираем
    const s1 = String(l.side1 ?? "");
    const s2 = String(l.side2 ?? "");
    return !removeEntities.has(s1) && !removeEntities.has(s2);
  });

  return rebuild(current, { entities, linkages });
}

/* ------------------------------------------------------------------ */
/*                          Утилиты                                    */
/* ------------------------------------------------------------------ */

function rebuild(
  current: Record<string, unknown>,
  patches: Record<string, unknown>,
): MutationResult {
  const merged = { ...current, ...patches };

  // чистим пустые массивы (чтобы не оставлять "entities: []")
  for (const [k, v] of Object.entries(merged)) {
    if (Array.isArray(v) && v.length === 0) {
      delete merged[k];
    }
  }

  const yaml = stringifyYaml(merged);
  const reparsed = parseYaml(yaml);
  return { yaml, parsed: reparsed.parsed, doc: reparsed.doc };
}

function readArr(o: Record<string, unknown>, key: string): unknown[] {
  const v = o[key];
  return Array.isArray(v) ? v : [];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
void parseFragment;
